/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IngestGetPipelineResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { IScopedClusterClient } from '@kbn/core/server';

export const getPipeline = async (
  pipelineName: string,
  client: IScopedClusterClient
): Promise<IngestGetPipelineResponse> => {
  try {
    const pipelinesResponse = await client.asCurrentUser.ingest.getPipeline({
      id: pipelineName,
    });

    return pipelinesResponse;
  } catch (error) {
    // If we can't find anything, we return an empty object
    return {};
  }
};
