/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

export function TransformSourceSelectionProvider({ getService }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const retry = getService('retry');

  return {
    async assertSourceListContainsEntry(sourceName: string) {
      await testSubjects.existOrFail(`savedObjectTitle${sourceName}`);
    },

    async filterSourceSelection(sourceName: string) {
      await testSubjects.setValue('savedObjectFinderSearchInput', sourceName, {
        clearWithKeyboard: true,
      });
      await this.assertSourceListContainsEntry(sourceName);
    },

    async selectSource(sourceName: string) {
      await this.filterSourceSelection(sourceName);
      await retry.tryForTime(30 * 1000, async () => {
        await testSubjects.clickWhenNotDisabledWithoutRetry(`savedObjectTitle${sourceName}`);
        await testSubjects.existOrFail('transformPageCreateTransform', { timeout: 10 * 1000 });
      });
    },
  };
}
