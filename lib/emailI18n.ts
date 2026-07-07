// lib/emailI18n.ts
// Email translation strings for billing & subscription templates
// Supported languages: en (English), es (Spanish), de (German), fr (French)

export type SupportedLanguage = "en" | "es" | "de" | "fr";

export const EMAIL_LANGUAGES: Record<SupportedLanguage, string> = {
  en: "English",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
};

interface EmailTranslations {
  // Common
  greeting: (name: string) => string;
  footerUnsubscribe: string;
  footerPrivacy: string;
  footerTerms: string;
  footerContact: string;
  footerRights: (year: number) => string;
  goToDashboard: string;
  needHelp: string;
  visitHelpCenter: string;
  supportTeamText: string;

  // Welcome email
  welcome: {
    headerSubtitle: string;
    greetingSuffix: string;
    introText: (planName: string) => string;
    planLabel: string;
    whatsIncluded: string;
    nextStepsTitle: string;
    nextSteps: string[];
    proTipsTitle: string;
    proTips: string[];
  };

  // Payment confirmation
  paymentConfirmation: {
    headerTitle: string;
    thankYou: (name: string) => string;
    successText: (planName: string) => string;
    statusBadge: string;
    labelPlan: string;
    labelAmount: string;
    labelPaymentDate: string;
    labelNextBilling: string;
    labelTotalPaid: string;
    downloadInvoice: string;
    renewalNote: (date: string) => string;
    contactSupport: string;
  };

  // Payment failed
  paymentFailed: {
    headerTitle: string;
    hi: (name: string) => string;
    actionRequired: string;
    alertText: string;
    labelPlan: string;
    labelAmount: string;
    labelRetryDate: string;
    updatePayment: string;
    whatHappensNext: string;
    retryNote: (date: string) => string;
    persistsNote: string;
    contactSupport: string;
  };

  // Plan upgraded
  planUpgraded: {
    headerTitle: string;
    greeting: (planName: string, name: string) => string;
    upgradeBadge: string;
    labelPreviousPlan: string;
    labelNewPlan: string;
    newCapabilities: string;
    exploreCta: string;
    upgradeNote: string;
  };
}

const translations: Record<SupportedLanguage, EmailTranslations> = {
  en: {
    greeting: (name) => `Welcome to FinovaOS, ${name}! 🎉`,
    footerUnsubscribe: "Unsubscribe",
    footerPrivacy: "Privacy Policy",
    footerTerms: "Terms of Service",
    footerContact: "Contact Us",
    footerRights: (year) => `© ${year} Finova Forge. All rights reserved.`,
    goToDashboard: "Go to Dashboard →",
    needHelp: "Need Help?",
    visitHelpCenter: "Visit Help Center →",
    supportTeamText: "Our support team is here to help you get the most out of FinovaOS.",

    welcome: {
      headerSubtitle: "AI-Powered Accounting Platform",
      greetingSuffix: "! 🎉",
      introText: (planName) =>
        `Your ${planName} plan is now active. You're all set to start managing your business finances with intelligence and ease.`,
      planLabel: "Plan",
      whatsIncluded: "What's Included:",
      nextStepsTitle: "Next Steps:",
      nextSteps: [
        "Log in to your FinovaOS dashboard",
        "Connect your bank accounts (optional)",
        "Import your first invoice or transaction",
        "Explore AI features for business insights",
      ],
      proTipsTitle: "🚀 Pro Tips:",
      proTips: [
        "Use our AI Chat for instant accounting help",
        "Set up bank sync for automated reconciliation",
        "Create custom reports for your business needs",
      ],
    },

    paymentConfirmation: {
      headerTitle: "Payment Received",
      thankYou: (name) => `Thank you, ${name}!`,
      successText: (planName) =>
        `Your payment has been successfully processed. Your ${planName} plan is active and ready to use.`,
      statusBadge: "✓ Payment Confirmed",
      labelPlan: "Plan",
      labelAmount: "Amount",
      labelPaymentDate: "Payment Date",
      labelNextBilling: "Next Billing",
      labelTotalPaid: "Total Paid",
      downloadInvoice: "Download Invoice",
      renewalNote: (date) =>
        `Your subscription will automatically renew on <strong>${date}</strong>. You can manage your subscription anytime from your account dashboard.`,
      contactSupport: "Questions? Contact our support team.",
    },

    paymentFailed: {
      headerTitle: "Payment Failed",
      hi: (name) => `Hi ${name},`,
      actionRequired: "Action Required",
      alertText:
        "We couldn't process your payment. Please update your billing information to avoid service interruption.",
      labelPlan: "Plan",
      labelAmount: "Amount",
      labelRetryDate: "Retry Date",
      updatePayment: "Update Payment Method →",
      whatHappensNext: "What happens next?",
      retryNote: (date) =>
        `We'll automatically retry your payment on ${date}. If you update your payment method before then, we'll charge you immediately.`,
      persistsNote: "If this issue persists, please",
      contactSupport: "contact our support team",
    },

    planUpgraded: {
      headerTitle: "Plan Upgraded!",
      greeting: (planName, name) => `Welcome to ${planName}, ${name}!`,
      upgradeBadge: "✓ Upgrade Successful",
      labelPreviousPlan: "Previous Plan",
      labelNewPlan: "New Plan",
      newCapabilities: "New Capabilities Unlocked:",
      exploreCta: "Explore New Features →",
      upgradeNote: "Your upgrade is effective immediately. Enjoy the enhanced capabilities!",
    },
  },

  es: {
    greeting: (name) => `¡Bienvenido a FinovaOS, ${name}! 🎉`,
    footerUnsubscribe: "Cancelar suscripción",
    footerPrivacy: "Política de privacidad",
    footerTerms: "Términos de servicio",
    footerContact: "Contáctenos",
    footerRights: (year) => `© ${year} Finova Forge. Todos los derechos reservados.`,
    goToDashboard: "Ir al panel →",
    needHelp: "¿Necesita ayuda?",
    visitHelpCenter: "Visitar el centro de ayuda →",
    supportTeamText: "Nuestro equipo de soporte está aquí para ayudarle a sacar el máximo provecho de FinovaOS.",

    welcome: {
      headerSubtitle: "Plataforma de Contabilidad con IA",
      greetingSuffix: "! 🎉",
      introText: (planName) =>
        `Su plan ${planName} ya está activo. Está listo para comenzar a gestionar las finanzas de su negocio de forma inteligente y sencilla.`,
      planLabel: "Plan",
      whatsIncluded: "Qué incluye:",
      nextStepsTitle: "Próximos pasos:",
      nextSteps: [
        "Inicie sesión en su panel de FinovaOS",
        "Conecte sus cuentas bancarias (opcional)",
        "Importe su primera factura o transacción",
        "Explore las funciones de IA para obtener información empresarial",
      ],
      proTipsTitle: "🚀 Consejos pro:",
      proTips: [
        "Use nuestro chat de IA para ayuda contable instantánea",
        "Configure la sincronización bancaria para conciliación automática",
        "Cree informes personalizados para sus necesidades empresariales",
      ],
    },

    paymentConfirmation: {
      headerTitle: "Pago Recibido",
      thankYou: (name) => `¡Gracias, ${name}!`,
      successText: (planName) =>
        `Su pago ha sido procesado con éxito. Su plan ${planName} está activo y listo para usar.`,
      statusBadge: "✓ Pago confirmado",
      labelPlan: "Plan",
      labelAmount: "Monto",
      labelPaymentDate: "Fecha de pago",
      labelNextBilling: "Próxima facturación",
      labelTotalPaid: "Total pagado",
      downloadInvoice: "Descargar factura",
      renewalNote: (date) =>
        `Su suscripción se renovará automáticamente el <strong>${date}</strong>. Puede gestionar su suscripción en cualquier momento desde el panel de su cuenta.`,
      contactSupport: "¿Preguntas? Contacte a nuestro equipo de soporte.",
    },

    paymentFailed: {
      headerTitle: "Pago Fallido",
      hi: (name) => `Hola ${name},`,
      actionRequired: "Acción requerida",
      alertText:
        "No pudimos procesar su pago. Por favor actualice su información de facturación para evitar la interrupción del servicio.",
      labelPlan: "Plan",
      labelAmount: "Monto",
      labelRetryDate: "Fecha de reintento",
      updatePayment: "Actualizar método de pago →",
      whatHappensNext: "¿Qué pasa después?",
      retryNote: (date) =>
        `Reintentaremos su pago automáticamente el ${date}. Si actualiza su método de pago antes de esa fecha, le cobraremos inmediatamente.`,
      persistsNote: "Si el problema persiste, por favor",
      contactSupport: "contacte a nuestro equipo de soporte",
    },

    planUpgraded: {
      headerTitle: "¡Plan Actualizado!",
      greeting: (planName, name) => `¡Bienvenido a ${planName}, ${name}!`,
      upgradeBadge: "✓ Actualización exitosa",
      labelPreviousPlan: "Plan anterior",
      labelNewPlan: "Nuevo plan",
      newCapabilities: "Nuevas capacidades desbloqueadas:",
      exploreCta: "Explorar nuevas funciones →",
      upgradeNote: "Su actualización es efectiva de inmediato. ¡Disfrute las capacidades mejoradas!",
    },
  },

  de: {
    greeting: (name) => `Willkommen bei FinovaOS, ${name}! 🎉`,
    footerUnsubscribe: "Abmelden",
    footerPrivacy: "Datenschutzrichtlinie",
    footerTerms: "Nutzungsbedingungen",
    footerContact: "Kontakt",
    footerRights: (year) => `© ${year} Finova Forge. Alle Rechte vorbehalten.`,
    goToDashboard: "Zum Dashboard →",
    needHelp: "Hilfe benötigt?",
    visitHelpCenter: "Hilfe-Center besuchen →",
    supportTeamText: "Unser Support-Team hilft Ihnen, das Beste aus FinovaOS herauszuholen.",

    welcome: {
      headerSubtitle: "KI-gestützte Buchhaltungsplattform",
      greetingSuffix: "! 🎉",
      introText: (planName) =>
        `Ihr ${planName}-Plan ist jetzt aktiv. Sie können Ihre Unternehmensfinanzen jetzt intelligent und einfach verwalten.`,
      planLabel: "Plan",
      whatsIncluded: "Was ist enthalten:",
      nextStepsTitle: "Nächste Schritte:",
      nextSteps: [
        "Melden Sie sich bei Ihrem FinovaOS-Dashboard an",
        "Verbinden Sie Ihre Bankkonten (optional)",
        "Importieren Sie Ihre erste Rechnung oder Transaktion",
        "Erkunden Sie KI-Funktionen für Geschäftseinblicke",
      ],
      proTipsTitle: "🚀 Profi-Tipps:",
      proTips: [
        "Nutzen Sie unseren KI-Chat für sofortige Buchhaltungshilfe",
        "Richten Sie die Banksynchronisierung für automatische Abstimmung ein",
        "Erstellen Sie benutzerdefinierte Berichte für Ihre Geschäftsanforderungen",
      ],
    },

    paymentConfirmation: {
      headerTitle: "Zahlung Eingegangen",
      thankYou: (name) => `Vielen Dank, ${name}!`,
      successText: (planName) =>
        `Ihre Zahlung wurde erfolgreich verarbeitet. Ihr ${planName}-Plan ist aktiv und einsatzbereit.`,
      statusBadge: "✓ Zahlung bestätigt",
      labelPlan: "Plan",
      labelAmount: "Betrag",
      labelPaymentDate: "Zahlungsdatum",
      labelNextBilling: "Nächste Abrechnung",
      labelTotalPaid: "Gesamtbetrag",
      downloadInvoice: "Rechnung herunterladen",
      renewalNote: (date) =>
        `Ihr Abonnement wird am <strong>${date}</strong> automatisch verlängert. Sie können Ihr Abonnement jederzeit über Ihr Konto-Dashboard verwalten.`,
      contactSupport: "Fragen? Kontaktieren Sie unser Support-Team.",
    },

    paymentFailed: {
      headerTitle: "Zahlung Fehlgeschlagen",
      hi: (name) => `Hallo ${name},`,
      actionRequired: "Handlungsbedarf",
      alertText:
        "Wir konnten Ihre Zahlung nicht verarbeiten. Bitte aktualisieren Sie Ihre Zahlungsinformationen, um eine Unterbrechung des Dienstes zu vermeiden.",
      labelPlan: "Plan",
      labelAmount: "Betrag",
      labelRetryDate: "Wiederholungsdatum",
      updatePayment: "Zahlungsmethode aktualisieren →",
      whatHappensNext: "Was passiert als nächstes?",
      retryNote: (date) =>
        `Wir werden Ihre Zahlung automatisch am ${date} erneut versuchen. Wenn Sie Ihre Zahlungsmethode vorher aktualisieren, berechnen wir Ihnen sofort.`,
      persistsNote: "Wenn das Problem weiterhin besteht, wenden Sie sich bitte an",
      contactSupport: "unser Support-Team",
    },

    planUpgraded: {
      headerTitle: "Plan Aktualisiert!",
      greeting: (planName, name) => `Willkommen bei ${planName}, ${name}!`,
      upgradeBadge: "✓ Upgrade erfolgreich",
      labelPreviousPlan: "Vorheriger Plan",
      labelNewPlan: "Neuer Plan",
      newCapabilities: "Neue Funktionen freigeschaltet:",
      exploreCta: "Neue Funktionen entdecken →",
      upgradeNote: "Ihr Upgrade ist sofort wirksam. Genießen Sie die erweiterten Möglichkeiten!",
    },
  },

  fr: {
    greeting: (name) => `Bienvenue sur FinovaOS, ${name} ! 🎉`,
    footerUnsubscribe: "Se désabonner",
    footerPrivacy: "Politique de confidentialité",
    footerTerms: "Conditions d'utilisation",
    footerContact: "Nous contacter",
    footerRights: (year) => `© ${year} Finova Forge. Tous droits réservés.`,
    goToDashboard: "Aller au tableau de bord →",
    needHelp: "Besoin d'aide ?",
    visitHelpCenter: "Visiter le centre d'aide →",
    supportTeamText:
      "Notre équipe d'assistance est là pour vous aider à tirer le meilleur parti de FinovaOS.",

    welcome: {
      headerSubtitle: "Plateforme comptable alimentée par l'IA",
      greetingSuffix: " ! 🎉",
      introText: (planName) =>
        `Votre plan ${planName} est maintenant actif. Vous êtes prêt à gérer vos finances d'entreprise avec intelligence et facilité.`,
      planLabel: "Forfait",
      whatsIncluded: "Ce qui est inclus :",
      nextStepsTitle: "Prochaines étapes :",
      nextSteps: [
        "Connectez-vous à votre tableau de bord FinovaOS",
        "Connectez vos comptes bancaires (facultatif)",
        "Importez votre première facture ou transaction",
        "Explorez les fonctionnalités IA pour des insights commerciaux",
      ],
      proTipsTitle: "🚀 Conseils pro :",
      proTips: [
        "Utilisez notre chat IA pour une aide comptable instantanée",
        "Configurez la synchronisation bancaire pour un rapprochement automatique",
        "Créez des rapports personnalisés pour vos besoins professionnels",
      ],
    },

    paymentConfirmation: {
      headerTitle: "Paiement Reçu",
      thankYou: (name) => `Merci, ${name} !`,
      successText: (planName) =>
        `Votre paiement a été traité avec succès. Votre plan ${planName} est actif et prêt à être utilisé.`,
      statusBadge: "✓ Paiement confirmé",
      labelPlan: "Forfait",
      labelAmount: "Montant",
      labelPaymentDate: "Date de paiement",
      labelNextBilling: "Prochaine facturation",
      labelTotalPaid: "Total payé",
      downloadInvoice: "Télécharger la facture",
      renewalNote: (date) =>
        `Votre abonnement sera automatiquement renouvelé le <strong>${date}</strong>. Vous pouvez gérer votre abonnement à tout moment depuis votre tableau de bord.`,
      contactSupport: "Des questions ? Contactez notre équipe d'assistance.",
    },

    paymentFailed: {
      headerTitle: "Paiement Échoué",
      hi: (name) => `Bonjour ${name},`,
      actionRequired: "Action requise",
      alertText:
        "Nous n'avons pas pu traiter votre paiement. Veuillez mettre à jour vos informations de facturation pour éviter toute interruption de service.",
      labelPlan: "Forfait",
      labelAmount: "Montant",
      labelRetryDate: "Date de nouvelle tentative",
      updatePayment: "Mettre à jour le mode de paiement →",
      whatHappensNext: "Que se passe-t-il ensuite ?",
      retryNote: (date) =>
        `Nous réessaierons automatiquement votre paiement le ${date}. Si vous mettez à jour votre mode de paiement avant cette date, nous vous facturerons immédiatement.`,
      persistsNote: "Si le problème persiste, veuillez",
      contactSupport: "contacter notre équipe d'assistance",
    },

    planUpgraded: {
      headerTitle: "Forfait Mis à Niveau !",
      greeting: (planName, name) => `Bienvenue dans ${planName}, ${name} !`,
      upgradeBadge: "✓ Mise à niveau réussie",
      labelPreviousPlan: "Ancien forfait",
      labelNewPlan: "Nouveau forfait",
      newCapabilities: "Nouvelles fonctionnalités débloquées :",
      exploreCta: "Explorer les nouvelles fonctionnalités →",
      upgradeNote:
        "Votre mise à niveau est effective immédiatement. Profitez des capacités améliorées !",
    },
  },
};

export function getEmailTranslations(language: string = "en"): EmailTranslations {
  const lang = (language as SupportedLanguage) in translations ? (language as SupportedLanguage) : "en";
  return translations[lang];
}

export function detectLanguageFromCountry(country: string): SupportedLanguage {
  const countryMap: Record<string, SupportedLanguage> = {
    ES: "es", MX: "es", AR: "es", CO: "es", PE: "es", VE: "es", CL: "es",
    DE: "de", AT: "de", CH: "de",
    FR: "fr", BE: "fr", LU: "fr",
  };
  const upper = (country || "").toUpperCase();
  return countryMap[upper] || "en";
}
