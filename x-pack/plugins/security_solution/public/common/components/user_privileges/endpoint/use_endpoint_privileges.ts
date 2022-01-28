/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useCurrentUser, useKibana } from '../../../lib/kibana';
import { useLicense } from '../../../hooks/use_license';
import {
  EndpointPrivileges,
  Immutable,
  MaybeImmutable,
} from '../../../../../common/endpoint/types';
import {
  calculateEndpointAuthz,
  getEndpointAuthzInitialState,
} from '../../../../../common/endpoint/service/authz';
import { FleetAuthz } from '../../../../../../fleet/common';

/**
 * Retrieve the endpoint privileges for the current user.
 *
 * **NOTE:** Consider using `usePrivileges().endpointPrivileges` instead of this hook in order
 * to keep API calls to a minimum.
 */
export const useEndpointPrivileges = (): Immutable<EndpointPrivileges> => {
  const user = useCurrentUser();
  const fleetServices = useKibana().services.fleet;
  const isMounted = useRef<boolean>(true);
  const licenseService = useLicense();
  const [fleetCheckDone, setFleetCheckDone] = useState<boolean>(false);
  const [fleetAuthz, setFleetAuthz] = useState<FleetAuthz | null>(null);
  const [userRolesCheckDone, setUserRolesCheckDone] = useState<boolean>(false);
  const [userRoles, setUserRoles] = useState<MaybeImmutable<string[]>>([]);

  const privileges = useMemo(() => {
    const privilegeList: EndpointPrivileges = Object.freeze({
      loading: !fleetCheckDone || !userRolesCheckDone || !user,
      ...(fleetAuthz
        ? calculateEndpointAuthz(licenseService, fleetAuthz, userRoles)
        : getEndpointAuthzInitialState()),
    });

    return privilegeList;
  }, [fleetCheckDone, userRolesCheckDone, user, fleetAuthz, licenseService, userRoles]);

  // Check if user can access fleet
  useEffect(() => {
    if (!fleetServices) {
      setFleetCheckDone(true);
      return;
    }

    setFleetCheckDone(false);

    (async () => {
      try {
        const fleetAuthzForCurrentUser = await fleetServices.authz;

        if (isMounted.current) {
          setFleetAuthz(fleetAuthzForCurrentUser);
        }
      } finally {
        if (isMounted.current) {
          setFleetCheckDone(true);
        }
      }
    })();
  }, [fleetServices]);

  // get user roles
  useEffect(() => {
    (async () => {
      if (user && isMounted.current) {
        setUserRoles(user?.roles);
        setUserRolesCheckDone(true);
      }
    })();
  }, [user]);

  // Capture if component is unmounted
  useEffect(
    () => () => {
      isMounted.current = false;
    },
    []
  );

  return privileges;
};
