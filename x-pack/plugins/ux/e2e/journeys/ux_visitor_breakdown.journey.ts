/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { journey, step, before } from '@elastic/synthetics';
import { UXDashboardDatePicker } from '../page_objects/date_picker';
import {
  byLensDataLayerId,
  byLensTestId,
  loginToKibana,
  waitForLoadingToFinish,
} from './utils';

const osNameMetric = 'ux-visitor-breakdown-user_agent-os-name';
const uaNameMetric = 'ux-visitor-breakdown-user_agent-name';

const chartIds = [osNameMetric, uaNameMetric];

const osNames = [
  'Windows',
  'Mac OS X',
  'Linux',
  'Android',
  'iOS',
  'Ubuntu',
  'Chrome OS',
];

const uaNames = [
  'Chrome',
  'Edge',
  'Firefox',
  'Safari',
  'Chrome Mobile',
  'HeadlessChrome',
  'Opera',
  'Other',
  'Other',
  'Chrome Mobile WebView',
  'Mobile Safari',
];

journey('UX Visitor Breakdown', async ({ page, params }) => {
  before(async () => {
    await waitForLoadingToFinish({ page });
  });

  const queryParams = {
    percentile: '50',
    rangeFrom: '2020-05-18T11:51:00.000Z',
    rangeTo: '2021-10-30T06:37:15.536Z',
  };
  const queryString = new URLSearchParams(queryParams).toString();

  const baseUrl = `${params.kibanaUrl}/app/ux`;

  step('Go to UX Dashboard', async () => {
    await page.goto(`${baseUrl}?${queryString}`, {
      waitUntil: 'networkidle',
    });
    await loginToKibana({
      page,
      user: { username: 'elastic', password: 'changeme' },
    });
  });

  step('Set date range', async () => {
    const datePickerPage = new UXDashboardDatePicker(page);
    await datePickerPage.setDefaultE2eRange();
  });

  step('Confirm charts are visible', async () => {
    // Wait until chart data is loaded
    await page.waitForLoadState('networkidle');

    await Promise.all(
      chartIds.map(
        async (dataTestId) =>
          // lens embeddable injects its own test attribute
          await page.waitForSelector(byLensTestId(dataTestId))
      )
    );
  });

  step('Check user_agent.name data layers', async () => {
    // Wait until chart data is loaded
    await page.waitForLoadState('networkidle');

    await Promise.all(
      uaNames.map(
        async (dataTestId) =>
          // lens embeddable injects its own test attribute
          await page.waitForSelector(byLensDataLayerId(dataTestId), {
            state: 'attached',
          })
      )
    );
  });

  step('Check user_agent.os.name data layers', async () => {
    // Wait until chart data is loaded
    await page.waitForLoadState('networkidle');

    await Promise.all(
      osNames.map(
        async (dataTestId) =>
          // lens embeddable injects its own test attribute
          await page.waitForSelector(byLensDataLayerId(dataTestId), {
            state: 'attached',
          })
      )
    );
  });
});
