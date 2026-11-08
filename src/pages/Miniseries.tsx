import React from 'react';
import ImportacaoAutomatica from './ImportacaoAutomatica';
import { PermissionGate } from '@/components/PermissionGate';

const Miniseries = () => (
  <PermissionGate feature="miniseries">
    <ImportacaoAutomatica variant="miniseries" />
  </PermissionGate>
);

export default Miniseries;
