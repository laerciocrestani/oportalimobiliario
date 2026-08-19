export const BUILDER_PERMISSIONS = [
  'buildings.view',
  'buildings.manage',
  'units.manage',
  'units.update_status',
  'invites.send',
  'access.manage',
  'reservations.cancel',
  'team.manage',
  'contracts.manage',
  'audit.view',
] as const

export type BuilderPermission = (typeof BUILDER_PERMISSIONS)[number]

export const builderPermissionLabels: Record<BuilderPermission, string> = {
  'buildings.view': 'Ver empreendimentos',
  'buildings.manage': 'Gerenciar empreendimentos e torres',
  'units.manage': 'Gerenciar unidades',
  'units.update_status': 'Alterar status de unidades',
  'invites.send': 'Convidar corretores',
  'access.manage': 'Gerenciar acesso de corretores',
  'reservations.cancel': 'Cancelar reservas',
  'team.manage': 'Gerenciar equipe',
  'contracts.manage': 'Gerenciar contratos',
  'audit.view': 'Auditar atividade da equipe',
}
