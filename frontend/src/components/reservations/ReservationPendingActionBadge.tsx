const PENDING_ACTION_LABELS: Record<string, string> = {
  reply: 'Responder',
  proposal_decision: 'Proposta pendente',
  deposit_proof_approval: 'Comprovante pendente',
  witness_signature: 'Assinatura pendente',
  sold_validation: 'Validar venda',
  builder_contract_sign: 'Assinar contrato',
  return_signed_proposal: 'Devolver proposta',
  upload_signed_contract: 'Enviar contrato',
  submit_proposal: 'Reenviar proposta',
  submit_deposit_proof: 'Anexar comprovante',
  submit_contract_data: 'Dados do contrato',
  mark_signed_gov: 'Registrar assinatura',
}

export function ReservationPendingActionBadge({
  pendingAction,
}: {
  pendingAction: string | null
}) {
  if (!pendingAction) {
    return null
  }

  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
      {PENDING_ACTION_LABELS[pendingAction] ?? 'Ação pendente'}
    </span>
  )
}
