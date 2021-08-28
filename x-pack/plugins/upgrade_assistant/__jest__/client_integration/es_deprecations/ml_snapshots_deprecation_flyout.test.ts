/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act } from 'react-dom/test-utils';

import type { MlAction } from '../../../common/types';
import { ElasticsearchTestBed, setupElasticsearchPage, setupEnvironment } from '../helpers';
import { esDeprecationsMockResponse, MOCK_SNAPSHOT_ID, MOCK_JOB_ID } from './mocked_responses';

describe('Machine learning deprecation flyout', () => {
  let testBed: ElasticsearchTestBed;
  const { server, httpRequestsMockHelpers } = setupEnvironment();
  const mlDeprecation = esDeprecationsMockResponse.deprecations[0];

  afterAll(() => {
    server.restore();
  });

  beforeEach(async () => {
    httpRequestsMockHelpers.setLoadEsDeprecationsResponse(esDeprecationsMockResponse);
    httpRequestsMockHelpers.setUpgradeMlSnapshotStatusResponse({
      nodeId: 'my_node',
      snapshotId: MOCK_SNAPSHOT_ID,
      jobId: MOCK_JOB_ID,
      status: 'idle',
    });

    await act(async () => {
      testBed = await setupElasticsearchPage({ isReadOnlyMode: false });
    });

    const { find, exists, actions, component } = testBed;

    component.update();

    await actions.clickMlDeprecationAt(0);

    expect(exists('mlSnapshotDetails')).toBe(true);
    expect(find('mlSnapshotDetails.flyoutTitle').text()).toContain(
      'Upgrade or delete model snapshot'
    );
  });

  describe('upgrade snapshots', () => {
    it('successfully upgrades snapshots', async () => {
      const { find, actions, exists } = testBed;

      httpRequestsMockHelpers.setUpgradeMlSnapshotResponse({
        nodeId: 'my_node',
        snapshotId: MOCK_SNAPSHOT_ID,
        jobId: MOCK_JOB_ID,
        status: 'in_progress',
      });

      httpRequestsMockHelpers.setUpgradeMlSnapshotStatusResponse({
        nodeId: 'my_node',
        snapshotId: MOCK_SNAPSHOT_ID,
        jobId: MOCK_JOB_ID,
        status: 'complete',
      });

      expect(find('mlSnapshotDetails.upgradeSnapshotButton').text()).toEqual('Upgrade');

      await actions.clickUpgradeMlSnapshot();

      // First, we expect a POST request to upgrade the snapshot
      const upgradeRequest = server.requests[server.requests.length - 2];
      expect(upgradeRequest.method).toBe('POST');
      expect(upgradeRequest.url).toBe('/api/upgrade_assistant/ml_snapshots');

      // Next, we expect a GET request to check the status of the upgrade
      const statusRequest = server.requests[server.requests.length - 1];
      expect(statusRequest.method).toBe('GET');
      expect(statusRequest.url).toBe(
        `/api/upgrade_assistant/ml_snapshots/${MOCK_JOB_ID}/${MOCK_SNAPSHOT_ID}`
      );

      // Verify the "Resolution" column of the table is updated
      expect(find('mlActionResolutionCell').text()).toContain('Upgrade complete');

      // Reopen the flyout
      await actions.clickMlDeprecationAt(0);

      // Flyout actions should not be visible if deprecation was resolved
      expect(exists('mlSnapshotDetails.upgradeSnapshotButton')).toBe(false);
      expect(exists('mlSnapshotDetails.deleteSnapshotButton')).toBe(false);
    });

    it('handles upgrade failure', async () => {
      const { find, actions } = testBed;

      const error = {
        statusCode: 500,
        error: 'Upgrade snapshot error',
        message: 'Upgrade snapshot error',
      };

      httpRequestsMockHelpers.setUpgradeMlSnapshotResponse(undefined, error);
      httpRequestsMockHelpers.setUpgradeMlSnapshotStatusResponse({
        nodeId: 'my_node',
        snapshotId: MOCK_SNAPSHOT_ID,
        jobId: MOCK_JOB_ID,
        status: 'error',
        error,
      });

      await actions.clickUpgradeMlSnapshot();

      const upgradeRequest = server.requests[server.requests.length - 1];
      expect(upgradeRequest.method).toBe('POST');
      expect(upgradeRequest.url).toBe('/api/upgrade_assistant/ml_snapshots');

      // Verify the "Resolution" column of the table is updated
      expect(find('mlActionResolutionCell').text()).toContain('Upgrade failed');

      // Reopen the flyout
      await actions.clickMlDeprecationAt(0);

      // Verify the flyout shows an error message
      expect(find('mlSnapshotDetails.resolveSnapshotError').text()).toContain(
        'Error upgrading snapshot'
      );
      // Verify the upgrade button text changes
      expect(find('mlSnapshotDetails.upgradeSnapshotButton').text()).toEqual('Retry upgrade');
    });
  });

  describe('delete snapshots', () => {
    it('successfully deletes snapshots', async () => {
      const { find, actions } = testBed;

      httpRequestsMockHelpers.setDeleteMlSnapshotResponse({
        acknowledged: true,
      });

      expect(find('mlSnapshotDetails.deleteSnapshotButton').text()).toEqual('Delete');

      await actions.clickDeleteMlSnapshot();

      const request = server.requests[server.requests.length - 1];

      expect(request.method).toBe('DELETE');
      expect(request.url).toBe(
        `/api/upgrade_assistant/ml_snapshots/${
          (mlDeprecation.correctiveAction! as MlAction).jobId
        }/${(mlDeprecation.correctiveAction! as MlAction).snapshotId}`
      );

      // Verify the "Resolution" column of the table is updated
      expect(find('mlActionResolutionCell').at(0).text()).toEqual('Deletion complete');

      // Reopen the flyout
      await actions.clickMlDeprecationAt(0);
    });

    it('handles delete failure', async () => {
      const { find, actions } = testBed;

      const error = {
        statusCode: 500,
        error: 'Upgrade snapshot error',
        message: 'Upgrade snapshot error',
      };

      httpRequestsMockHelpers.setDeleteMlSnapshotResponse(undefined, error);

      await actions.clickDeleteMlSnapshot();

      const request = server.requests[server.requests.length - 1];

      expect(request.method).toBe('DELETE');
      expect(request.url).toBe(
        `/api/upgrade_assistant/ml_snapshots/${
          (mlDeprecation.correctiveAction! as MlAction).jobId
        }/${(mlDeprecation.correctiveAction! as MlAction).snapshotId}`
      );

      // Verify the "Resolution" column of the table is updated
      expect(find('mlActionResolutionCell').at(0).text()).toEqual('Deletion failed');

      // Reopen the flyout
      await actions.clickMlDeprecationAt(0);

      // Verify the flyout shows an error message
      expect(find('mlSnapshotDetails.resolveSnapshotError').text()).toContain(
        'Error deleting snapshot'
      );
      // Verify the upgrade button text changes
      expect(find('mlSnapshotDetails.deleteSnapshotButton').text()).toEqual('Retry delete');
    });
  });
});
