import { normalizeLanguage, SupportedLanguage } from '../notification/notification.translator';

export { normalizeLanguage, SupportedLanguage };

/**
 * Multi-language payment type translations.
 * Maps payment type keys to localized strings across:
 * 'en' (English), 'es' (Spanish), 'fr' (French), 'it' (Italian), 'pt' (Portuguese), 'hi' (Hindi)
 */
export const PAYMENT_TYPE_MAP: Record<string, Record<string, string>> = {
  tip: {
    en: 'Tip',
    es: 'Propina',
    fr: 'Pourboire',
    it: 'Mancia',
    pt: 'Gorjeta',
    hi: 'टिप',
  },
  following: {
    en: 'Following Subscription',
    es: 'Suscripción de Seguidor',
    fr: "Abonnement de Suivi",
    it: 'Abbonamento Seguito',
    pt: 'Assinatura de Seguidor',
    hi: 'फ़ॉलोइंग सदस्यता',
  },
  payfollowing: {
    en: 'Following Subscription',
    es: 'Suscripción de Seguidor',
    fr: "Abonnement de Suivi",
    it: 'Abbonamento Seguito',
    pt: 'Assinatura de Seguidor',
    hi: 'फ़ॉलोइंग सदस्यता',
  },
  subscription: {
    en: 'Subscription',
    es: 'Suscripción',
    fr: 'Abonnement',
    it: 'Abbonamento',
    pt: 'Assinatura',
    hi: 'सदस्यता',
  },
  fansubscription: {
    en: 'Fan Subscription',
    es: 'Suscripción de Fan',
    fr: 'Abonnement Fan',
    it: 'Abbonamento Fan',
    pt: 'Assinatura de Fã',
    hi: 'फैन सदस्यता',
  },
  fansubscriptionbuy: {
    en: 'Fan Subscription',
    es: 'Suscripción de Fan',
    fr: 'Abonnement Fan',
    it: 'Abbonamento Fan',
    pt: 'Assinatura de Fã',
    hi: 'फैन सदस्यता',
  },
  missiondonation: {
    en: 'Mission Donation',
    es: 'Donación de Misión',
    fr: 'Don de Mission',
    it: 'Donazione per la Missione',
    pt: 'Doação para Missão',
    hi: 'मिशन दान',
  },
  donate: {
    en: 'Mission Donation',
    es: 'Donación de Misión',
    fr: 'Don de Mission',
    it: 'Donazione per la Missione',
    pt: 'Doação para Missão',
    hi: 'मिशन दान',
  },
  donation: {
    en: 'Donation',
    es: 'Donación',
    fr: 'Don',
    it: 'Donazione',
    pt: 'Doação',
    hi: 'दान',
  },
  buyhit: {
    en: 'Post Credits',
    es: 'Créditos de Publicación',
    fr: 'Crédits de Publication',
    it: 'Crediti di Pubblicazione',
    pt: 'Créditos de Publicação',
    hi: 'पोस्ट क्रेडिट',
  },
  ebook: {
    en: 'Ebook Purchase',
    es: 'Compra de Ebook',
    fr: "Achat d'Ebook",
    it: 'Acquisto Ebook',
    pt: 'Compra de Ebook',
    hi: 'ई-बुक खरीदारी',
  },
  shopebook: {
    en: 'Shop Ebook',
    es: 'Ebook de Tienda',
    fr: 'Ebook de Boutique',
    it: 'Ebook Negozio',
    pt: 'Ebook da Loja',
    hi: 'शॉप ई-बुक',
  },
  ebookpayment: {
    en: 'Ebook Payment',
    es: 'Pago de Ebook',
    fr: "Paiement d'Ebook",
    it: 'Pagamento Ebook',
    pt: 'Pagamento de Ebook',
    hi: 'ई-बुक भुगतान',
  },
  digitalbadge: {
    en: 'Digital Badge',
    es: 'Insignia Digital',
    fr: 'Badge Numérique',
    it: 'Badge Digitale',
    pt: 'Emblema Digital',
    hi: 'डिजिटल बैज',
  },
  usdt: {
    en: 'USDT Transfer',
    es: 'Transferencia USDT',
    fr: 'Transfert USDT',
    it: 'Trasferimento USDT',
    pt: 'Transferência USDT',
    hi: 'USDT ट्रांसफर',
  },
  crypto: {
    en: 'Crypto Transfer',
    es: 'Transferencia Cripto',
    fr: 'Transfert Crypto',
    it: 'Trasferimento Cripto',
    pt: 'Transferência Cripto',
    hi: 'क्रिप्टो ट्रांसफर',
  },
  digital_transaction: {
    en: 'Digital Transaction',
    es: 'Transacción Digital',
    fr: 'Transaction Numérique',
    it: 'Transazione Digitale',
    pt: 'Transação Digital',
    hi: 'डिजिटल लेनदेन',
  },
  withdrawal: {
    en: 'Withdrawal',
    es: 'Retiro',
    fr: 'Retrait',
    it: 'Prelievo',
    pt: 'Saque',
    hi: 'निकासी',
  },
  payout: {
    en: 'Payout',
    es: 'Pago',
    fr: 'Paiement',
    it: 'Pagamento',
    pt: 'Pagamento',
    hi: 'भुगतान',
  },
  tokenpurchase: {
    en: 'Token Purchase',
    es: 'Compra de Tokens',
    fr: 'Achat de Jetons',
    it: 'Acquisto Token',
    pt: 'Compra de Tokens',
    hi: 'टोकन खरीद',
  },
  tokensale: {
    en: 'Token Sale',
    es: 'Venta de Tokens',
    fr: 'Vente de Jetons',
    it: 'Vendita Token',
    pt: 'Venda de Tokens',
    hi: 'टोकन बिक्री',
  },
  marketplace: {
    en: 'Marketplace Order',
    es: 'Pedido de Marketplace',
    fr: 'Commande Marketplace',
    it: 'Ordine Marketplace',
    pt: 'Pedido do Marketplace',
    hi: 'मार्केटप्लेस ऑर्डर',
  },
  shop: {
    en: 'Shop Order',
    es: 'Pedido de Tienda',
    fr: 'Commande Boutique',
    it: 'Ordine Negozio',
    pt: 'Pedido da Loja',
    hi: 'शॉप ऑर्डर',
  },
  order: {
    en: 'Order',
    es: 'Pedido',
    fr: 'Commande',
    it: 'Ordine',
    pt: 'Pedido',
    hi: 'ऑर्डर',
  },
  payment: {
    en: 'Payment',
    es: 'Pago',
    fr: 'Paiement',
    it: 'Pagamento',
    pt: 'Pagamento',
    hi: 'भुगतान',
  },
};

/**
 * Multi-language payment status translations.
 */
export const PAYMENT_STATUS_MAP: Record<string, Record<string, string>> = {
  paid: {
    en: 'Paid',
    es: 'Pagado',
    fr: 'Payé',
    it: 'Pagato',
    pt: 'Pago',
    hi: 'भुगतान किया गया',
  },
  succeeded: {
    en: 'Confirmed',
    es: 'Confirmado',
    fr: 'Confirmé',
    it: 'Confermato',
    pt: 'Confirmada',
    hi: 'सफल',
  },
  succeed: {
    en: 'Confirmed',
    es: 'Confirmado',
    fr: 'Confirmé',
    it: 'Confermato',
    pt: 'Confirmada',
    hi: 'सफल',
  },
  completed: {
    en: 'Completed',
    es: 'Completado',
    fr: 'Terminé',
    it: 'Completato',
    pt: 'Concluído',
    hi: 'पूर्ण',
  },
  confirmed: {
    en: 'Confirmed',
    es: 'Confirmado',
    fr: 'Confirmé',
    it: 'Confermato',
    pt: 'Confirmada',
    hi: 'सफल',
  },
  pending: {
    en: 'Pending',
    es: 'Pendiente',
    fr: 'En attente',
    it: 'In sospeso',
    pt: 'Pendente',
    hi: 'लंबित',
  },
  failed: {
    en: 'Failed',
    es: 'Fallido',
    fr: 'Échoué',
    it: 'Fallito',
    pt: 'Falhou',
    hi: 'विफल',
  },
  declined: {
    en: 'Declined',
    es: 'Rechazado',
    fr: 'Refusé',
    it: 'Rifiutato',
    pt: 'Recusado',
    hi: 'अस्वीकृत',
  },
  active: {
    en: 'Active',
    es: 'Activo',
    fr: 'Actif',
    it: 'Attivo',
    pt: 'Ativo',
    hi: 'सक्रिय',
  },
  inactive: {
    en: 'Inactive',
    es: 'Inactivo',
    fr: 'Inactif',
    it: 'Inattivo',
    pt: 'Inativo',
    hi: 'निष्क्रिय',
  },
  canceled: {
    en: 'Cancelled',
    es: 'Cancelado',
    fr: 'Annulé',
    it: 'Annullato',
    pt: 'Cancelado',
    hi: 'रद्द',
  },
  cancelled: {
    en: 'Cancelled',
    es: 'Cancelado',
    fr: 'Annulé',
    it: 'Annullato',
    pt: 'Cancelado',
    hi: 'रद्द',
  },
  refunded: {
    en: 'Refunded',
    es: 'Reembolsado',
    fr: 'Remboursé',
    it: 'Rimborsato',
    pt: 'Reembolsado',
    hi: 'वापस किया गया',
  },
  partially_refunded: {
    en: 'Partially Refunded',
    es: 'Parcialmente Reembolsado',
    fr: 'Partiellement Remboursé',
    it: 'Parzialmente Rimborsato',
    pt: 'Parcialmente Reembolsado',
    hi: 'आंशिक रूप से वापस किया गया',
  },
};

/**
 * Translates a payment type string to target language.
 * If language is 'en', returns English translation or normalized default.
 * If translation is not found, falls back to original string.
 */
export function translatePaymentType(paymentType?: string | null, lang?: string | null): string | null {
  if (!paymentType) return paymentType ?? null;
  const normalizedLang = normalizeLanguage(lang);
  const cleanKey = paymentType.trim().toLowerCase().replace(/[\s_-]+/g, '');
  const entry = PAYMENT_TYPE_MAP[cleanKey] || PAYMENT_TYPE_MAP[paymentType.trim().toLowerCase()];

  if (entry) {
    return entry[normalizedLang] || entry['en'] || paymentType;
  }
  return paymentType;
}

/**
 * Translates a payment / transaction status to target language.
 */
export function translatePaymentStatus(status?: string | null, lang?: string | null): string | null {
  if (!status) return status ?? null;
  const normalizedLang = normalizeLanguage(lang);
  const cleanKey = status.trim().toLowerCase().replace(/[\s_-]+/g, '_');
  const entry = PAYMENT_STATUS_MAP[cleanKey] || PAYMENT_STATUS_MAP[status.trim().toLowerCase()];

  if (entry) {
    return entry[normalizedLang] || entry['en'] || status;
  }
  return status;
}

/**
 * Translates a typeTransaction key (e.g. 'payFollowing', 'tip', 'donation', 'usdt', 'withdrawal', 'tokenSale', 'tokenPurchase', 'marketplace')
 */
export function translateTypeTransaction(typeTransaction?: string | null, lang?: string | null): string | null {
  return translatePaymentType(typeTransaction, lang);
}

/**
 * Localizes both payment type and status simultaneously.
 */
export function localizePaymentFields(
  lang?: string | null,
  forPayment?: string | null,
  status?: string | null,
): { forPayment: string | null; status: string | null } {
  const normalizedLang = normalizeLanguage(lang);
  return {
    forPayment: translatePaymentType(forPayment, normalizedLang),
    status: translatePaymentStatus(status, normalizedLang),
  };
}
