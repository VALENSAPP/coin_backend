/**
 * Multi-Language Notification Translator for Valens
 * Supported languages: 'en' (English), 'es' (Spanish), 'fr' (French), 'it' (Italian), 'pt' (Portuguese)
 */

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'it' | 'pt';

export interface TranslatedNotification {
  title: string;
  body: string;
}

interface PatternRule {
  // Regex pattern matching the English title (or exact string)
  titlePattern: RegExp | string;
  // Regex pattern matching the English body
  bodyPattern: RegExp | string;
  // Translators for each language (returning title and body)
  translations: {
    [key in 'es' | 'fr' | 'it' | 'pt']: (titleMatch: RegExpMatchArray | null, bodyMatch: RegExpMatchArray | null, data?: Record<string, any>) => TranslatedNotification;
  };
}

// Exact title mapping when body can be translated separately or generically
const TITLE_MAP: Record<string, Record<'es' | 'fr' | 'it' | 'pt', string>> = {
  'Welcome to Valens!': {
    es: '¡Bienvenido a Valens!',
    fr: 'Bienvenue sur Valens !',
    it: 'Benvenuto su Valens!',
    pt: 'Bem-vindo ao Valens!',
  },
  'New Follower': {
    es: 'Nuevo Seguidor',
    fr: 'Nouveau Abonné',
    it: 'Nuovo Follower',
    pt: 'Novo Seguidor',
  },
  '👤 New Follower!': {
    es: '👤 ¡Nuevo Seguidor!',
    fr: '👤 Nouveau Abonné !',
    it: '👤 Nuovo Follower!',
    pt: '👤 Novo Seguidor!',
  },
  'Follower Unfollowed': {
    es: 'Seguidor te dejó de seguir',
    fr: 'Abonné désabonné',
    it: 'Non ti segue più',
    pt: 'Seguidor deixou de seguir',
  },
  'Post Liked': {
    es: 'Publicación que te gusta',
    fr: 'Publication aimée',
    it: 'Mi piace al post',
    pt: 'Publicação Curtida',
  },
  '💬 New Comment': {
    es: '💬 Nuevo Comentario',
    fr: '💬 Nouveau Commentaire',
    it: '💬 Nuovo Commento',
    pt: '💬 Novo Comentário',
  },
  '📢 You were mentioned!': {
    es: '📢 ¡Fuiste mencionado!',
    fr: '📢 Vous avez été mentionné !',
    it: '📢 Sei stato menzionato!',
    pt: '📢 Você foi mencionado!',
  },
  'Tagged in a post': {
    es: 'Etiquetado en una publicación',
    fr: 'Identifié dans une publication',
    it: 'Taggato in un post',
    pt: 'Marcado em uma publicação',
  },
  'Tagged in a private circle post': {
    es: 'Etiquetado en un círculo privado',
    fr: 'Identifié dans un cercle privé',
    it: 'Taggato in un cerchio privato',
    pt: 'Marcado em um círculo privado',
  },
  'Achievements': {
    es: 'Logros',
    fr: 'Succès',
    it: 'Obiettivi',
    pt: 'Conquistas',
  },
  'Achievement Unlocked!': {
    es: '¡Logro Desbloqueado!',
    fr: 'Succès Débloqué !',
    it: 'Obiettivo Sbloccato!',
    pt: 'Conquista Desbloqueada!',
  },
  '🥇 New Badge Unlocked!': {
    es: '🥇 ¡Nueva Insignia Desbloqueada!',
    fr: '🥇 Nouveau Badge Débloqué !',
    it: '🥇 Nuovo Badge Sbloccato!',
    pt: '🥇 Novo Emblema Desbloqueado!',
  },
  "You've Been Chosen": {
    es: 'Has sido elegido',
    fr: 'Vous avez été choisi',
    it: 'Sei stato scelto',
    pt: 'Você foi escolhido',
  },
  '👥 Your Circle is growing!': {
    es: '👥 ¡Tu Círculo está creciendo!',
    fr: '👥 Votre Cercle s\'agrandit !',
    it: '👥 Il tuo Cerchio sta crescendo!',
    pt: '👥 Seu Círculo está crescendo!',
  },
  '🔐 New exclusive post in your Circle!': {
    es: '🔐 ¡Nueva publicación exclusiva en tu Círculo!',
    fr: '🔐 Nouvelle publication exclusive dans votre Cercle !',
    it: '🔐 Nuovo post esclusivo nel tuo Cerchio!',
    pt: '🔐 Nova publicação exclusiva no seu Círculo!',
  },
  '🔓 Private Circle access removed.': {
    es: '🔓 Acceso al Círculo Privado eliminado.',
    fr: '🔓 Accès au Cercle Privé retiré.',
    it: '🔓 Accesso al Cerchio Privato rimosso.',
    pt: '🔓 Acesso ao Círculo Privado removido.',
  },
  '🎬 Your Drop is trending!': {
    es: '🎬 ¡Tu Drop es tendencia!',
    fr: '🎬 Votre Drop est tendance !',
    it: '🎬 Il tuo Drop è di tendenza!',
    pt: '🎬 Seu Drop está em alta!',
  },
  '👁 Your Story is Popular!': {
    es: '👁 ¡Tu Historia es Popular!',
    fr: '👁 Votre Histoire est populaire !',
    it: '👁 La tua Storia è Popolare!',
    pt: '👁 Seu Story está Popular!',
  },
  '⚠️ 1 Post Credit Left': {
    es: '⚠️ Queda 1 Crédito de Publicación',
    fr: '⚠️ Plus qu\'un Crédit de Publication',
    it: '⚠️ 1 Credito di Pubblicazione Rimasto',
    pt: '⚠️ Resta 1 Crédito de Publicação',
  },
  'Battle Invitation': {
    es: 'Invitación a Batalla',
    fr: 'Invitation au Défi',
    it: 'Invito alla Battaglia',
    pt: 'Convite para Batalha',
  },
  'Shop Battle Challenge': {
    es: 'Desafío de Batalla de Tienda',
    fr: 'Défi de Boutique',
    it: 'Sfida Battaglia Negozio',
    pt: 'Desafio de Batalha de Loja',
  },
  'Shop Battle Accepted': {
    es: 'Batalla de Tienda Aceptada',
    fr: 'Défi de Boutique Accepté',
    it: 'Battaglia Negozio Accettata',
    pt: 'Batalha de Loja Aceita',
  },
  'Shop Battle Declined': {
    es: 'Batalla de Tienda Rechazada',
    fr: 'Défi de Boutique Refusé',
    it: 'Battaglia Negozio Rifiutata',
    pt: 'Batalha de Loja Recusada',
  },
  '⚔️ Battle Started': {
    es: '⚔️ Batalla Iniciada',
    fr: '⚔️ Défi Lancé',
    it: '⚔️ Battaglia Iniziata',
    pt: '⚔️ Batalha Iniciada',
  },
  '👥 New Participants!': {
    es: '👥 ¡Nuevos Participantes!',
    fr: '👥 Nouveaux Participants !',
    it: '👥 Nuovi Partecipanti!',
    pt: '👥 Novos Participantes!',
  },
  '⏳ Battle Closing Soon': {
    es: '⏳ La Batalla Termina Pronto',
    fr: '⏳ Fin du Défi Imminente',
    it: '⏳ Battaglia in Chiusura',
    pt: '⏳ Batalha Encerrando em Breve',
  },
  '🏆 Battle Completed': {
    es: '🏆 Batalla Completada',
    fr: '🏆 Défi Terminé',
    it: '🏆 Battaglia Completata',
    pt: '🏆 Batalha Concluída',
  },
  'Battle Declined': {
    es: 'Batalla Rechazada',
    fr: 'Défi Refusé',
    it: 'Battaglia Rifiutata',
    pt: 'Batalha Recusada',
  },
  'Battle Invite Expired': {
    es: 'Invitación a Batalla Expirada',
    fr: 'Invitation Expirée',
    it: 'Invito alla Battaglia Scaduto',
    pt: 'Convite de Batalha Expirado',
  },
  'Battle Result': {
    es: 'Resultado de Batalla',
    fr: 'Résultat du Défi',
    it: 'Risultato Battaglia',
    pt: 'Resultado da Batalha',
  },
  'Battle Closed': {
    es: 'Batalla Cerrada',
    fr: 'Défi Clôturé',
    it: 'Battaglia Chiusa',
    pt: 'Batalha Encerrada',
  },
  'Victory! Your side won!': {
    es: '¡Victoria! ¡Tu lado ganó!',
    fr: 'Victoire ! Votre camp a gagné !',
    it: 'Vittoria! La tua fazione ha vinto!',
    pt: 'Vitória! Seu lado venceu!',
  },
  'Battle Victory!': {
    es: '¡Victoria en la Batalla!',
    fr: 'Victoire au Défi !',
    it: 'Vittoria nella Battaglia!',
    pt: 'Vitória na Batalha!',
  },
  'Battle Result Updated': {
    es: 'Resultado de Batalla Actualizado',
    fr: 'Résultat Mis à Jour',
    it: 'Risultato Battaglia Aggiornato',
    pt: 'Resultado de Batalha Atualizado',
  },
  'You moved up the leaderboard!': {
    es: '¡Subiste en la clasificación!',
    fr: 'Vous avez progressé au classement !',
    it: 'Sei salito in classifica!',
    pt: 'Você subiu no ranking!',
  },
  'New Battle': {
    es: 'Nueva Batalla',
    fr: 'Nouveau Défi',
    it: 'Nuova Battaglia',
    pt: 'Nova Batalha',
  },
  '📈 Mission is 25% funded!': {
    es: '📈 ¡La Misión está financiada al 25%!',
    fr: '📈 Mission financée à 25 % !',
    it: '📈 Missione finanziata al 25%!',
    pt: '📈 Missão 25% financiada!',
  },
  '🔥 Halfway there! Mission is 50% funded.': {
    es: '🔥 ¡A mitad de camino! La Misión está al 50%.',
    fr: '🔥 À mi-chemin ! Mission financée à 50 %.',
    it: '🔥 A metà strada! Missione finanziata al 50%.',
    pt: '🔥 Metade do caminho! Missão 50% financiada.',
  },
  '⚡ Almost there! Mission is 75% funded.': {
    es: '⚡ ¡Casi listos! La Misión está al 75%.',
    fr: '⚡ Presque là ! Mission financée à 75 %.',
    it: '⚡ Quasi completata! Missione finanziata al 75%.',
    pt: '⚡ Quase lá! Missão 75% financiada.',
  },
  '🏦 New Backer on your Mission!': {
    es: '🏦 ¡Nuevo Patrocinador en tu Misión!',
    fr: '🏦 Nouveau Soutien pour votre Mission !',
    it: '🏦 Nuovo Sostenitore per la tua Missione!',
    pt: '🏦 Novo Apoiador na sua Missão!',
  },
  'New Mission Backer': {
    es: 'Nuevo Patrocinador de Misión',
    fr: 'Nouveau Soutien de Mission',
    it: 'Nuovo Sostenitore Missione',
    pt: 'Novo Apoiador de Missão',
  },
  '🎉 Your Mission is FULLY FUNDED!': {
    es: '🎉 ¡Tu Misión está TOTALMENTE FINANCIADA!',
    fr: '🎉 Votre Mission est ENTIÈREMENT FINANCÉE !',
    it: '🎉 La tua Missione è COMPLETAMENTE FINANZIATA!',
    pt: '🎉 Sua Missão está TOTALMENTE FINANCIADA!',
  },
  '🎉 Mission Fully Funded!': {
    es: '🎉 ¡Misión Totalmente Financiada!',
    fr: '🎉 Mission Entièrement Financée !',
    it: '🎉 Missione Completamente Finanziata!',
    pt: '🎉 Missão Totalmente Financiada!',
  },
  '⏰ Mission ends in 24 hours!': {
    es: '⏰ ¡La Misión termina en 24 horas!',
    fr: '⏰ La Mission se termine dans 24 heures !',
    it: '⏰ La Missione termina tra 24 ore!',
    pt: '⏰ A Missão termina em 24 horas!',
  },
  '✅ Contribution Confirmed!': {
    es: '✅ ¡Contribución Confirmada!',
    fr: '✅ Contribution Confirmée !',
    it: '✅ Contributo Confermato!',
    pt: '✅ Contribuição Confirmada!',
  },
  'Mission Contribution Confirmed': {
    es: 'Contribución a Misión Confirmada',
    fr: 'Contribution à la Mission Confirmée',
    it: 'Contributo Missione Confermato',
    pt: 'Contribuição para Missão Confirmada',
  },
  'Order Placed Successfully': {
    es: 'Pedido Realizado con Éxito',
    fr: 'Commande Passée avec Succès',
    it: 'Ordine Effettuato con Successo',
    pt: 'Pedido Realizado com Sucesso',
  },
  'You have a new order': {
    es: 'Tienes un nuevo pedido',
    fr: 'Vous avez une nouvelle commande',
    it: 'Hai un nuovo ordine',
    pt: 'Você tem um novo pedido',
  },
  'Your Order is being prepared! 📦': {
    es: '¡Tu pedido se está preparando! 📦',
    fr: 'Votre commande est en préparation ! 📦',
    it: 'Il tuo ordine è in preparazione! 📦',
    pt: 'Seu pedido está sendo preparado! 📦',
  },
  'Order Shipped': {
    es: 'Pedido Enviado',
    fr: 'Commande Expédiée',
    it: 'Ordine Spedito',
    pt: 'Pedido Enviado',
  },
  'Order Delivered': {
    es: 'Pedido Entregado',
    fr: 'Commande Livrée',
    it: 'Ordine Consegnato',
    pt: 'Pedido Entregue',
  },
  'Confirm your delivery': {
    es: 'Confirma tu entrega',
    fr: 'Confirmez votre livraison',
    it: 'Conferma la consegna',
    pt: 'Confirme sua entrega',
  },
  'Delivered – Earnings Pending': {
    es: 'Entregado – Ganancias Pendientes',
    fr: 'Livré – Gains en Attente',
    it: 'Consegnato – Guadagni in Sospeso',
    pt: 'Entregue – Ganhos Pendentes',
  },
  'Earnings Available': {
    es: 'Ganancias Disponibles',
    fr: 'Gains Disponibles',
    it: 'Guadagni Disponibili',
    pt: 'Ganhos Disponíveis',
  },
  'Delivery Exception': {
    es: 'Excepción en la Entrega',
    fr: 'Problème de Livraison',
    it: 'Problema di Consegna',
    pt: 'Exceção na Entrega',
  },
  'Order Cancelled': {
    es: 'Pedido Cancelado',
    fr: 'Commande Annulée',
    it: 'Ordine Annullato',
    pt: 'Pedido Cancelado',
  },
  'Cancellation Requested': {
    es: 'Cancelación Solicitada',
    fr: 'Annulation Demandée',
    it: 'Annullamento Richiesto',
    pt: 'Cancelamento Solicitado',
  },
  'Cancellation Request Declined': {
    es: 'Solicitud de Cancelación Rechazada',
    fr: 'Demande d\'Annulation Refusée',
    it: 'Richiesta di Annullamento Rifiutata',
    pt: 'Solicitação de Cancelamento Recusada',
  },
  '🎉 Pickup Completed!': {
    es: '🎉 ¡Recogida Completada!',
    fr: '🎉 Retrait Effectué !',
    it: '🎉 Ritiro Completato!',
    pt: '🎉 Retirada Concluída!',
  },
  '🎉 Sale completed!': {
    es: '🎉 ¡Venta completada!',
    fr: '🎉 Vente terminée !',
    it: '🎉 Vendita completata!',
    pt: '🎉 Venda concluída!',
  },
  'New chat message': {
    es: 'Nuevo mensaje de chat',
    fr: 'Nouveau message de discussion',
    it: 'Nuovo messaggio in chat',
    pt: 'Nova mensagem no chat',
  },
  'Platform Points Received': {
    es: 'Puntos de Plataforma Recibidos',
    fr: 'Points de Plateforme Reçus',
    it: 'Punti Piattaforma Ricevuti',
    pt: 'Pontos da Plataforma Recebidos',
  },
  'Tokens Credited': {
    es: 'Tokens Acreditados',
    fr: 'Jetons Crédités',
    it: 'Token Accreditati',
    pt: 'Tokens Creditados',
  },
  'Tokens Received': {
    es: 'Tokens Recibidos',
    fr: 'Jetons Reçus',
    it: 'Token Ricevuti',
    pt: 'Tokens Recebidos',
  },
  'Payout Deposited': {
    es: 'Pago Depositado',
    fr: 'Paiement Déposé',
    it: 'Pagamento Depositato',
    pt: 'Pagamento Depositado',
  },
  'Withdrawal Successful': {
    es: 'Retiro Exitoso',
    fr: 'Retrait Réussi',
    it: 'Prelievo Riuscito',
    pt: 'Saque Bem-sucedido',
  },
  'Withdrawal Failed': {
    es: 'Retiro Fallido',
    fr: 'Échec du Retrait',
    it: 'Prelievo Non Riuscito',
    pt: 'Falha no Saque',
  },
  'Payout Frozen': {
    es: 'Pago Retenido',
    fr: 'Paiement Bloqué',
    it: 'Pagamento Bloccato',
    pt: 'Pagamento Bloqueado',
  },
  'Bank Payout Issue': {
    es: 'Problema de Pago Bancario',
    fr: 'Problème de Paiement Bancaire',
    it: 'Problema di Pagamento Bancario',
    pt: 'Problema no Pagamento Bancário',
  },
  'Subscription Price Updated': {
    es: 'Precio de Suscripción Actualizado',
    fr: 'Prix de l\'Abonnement Mis à Jour',
    it: 'Prezzo Abbonamento Aggiornato',
    pt: 'Preço da Assinatura Atualizado',
  },
  'Subscription Autopay Cancelled': {
    es: 'Pago Automático de Suscripción Cancelado',
    fr: 'Renouvellement Automatique Annulé',
    it: 'Rinnovo Automatico Annullato',
    pt: 'Renovação Automática Cancelada',
  },
  'Subscription Ended': {
    es: 'Suscripción Finalizada',
    fr: 'Abonnement Terminé',
    it: 'Abbonamento Terminato',
    pt: 'Assinatura Encerrada',
  },
  'Subscription Active': {
    es: 'Suscripción Activa',
    fr: 'Abonnement Actif',
    it: 'Abbonamento Attivo',
    pt: 'Assinatura Ativa',
  },
  'Order Status': {
    es: 'Estado del Pedido',
    fr: 'Statut de la Commande',
    it: 'Stato dell\'Ordine',
    pt: 'Status do Pedido',
  },
  'Order Update': {
    es: 'Actualización de Pedido',
    fr: 'Mise à Jour de la Commande',
    it: 'Aggiornamento Ordine',
    pt: 'Atualização do Pedido',
  },
};

const PATTERN_RULES: PatternRule[] = [
  // 1. Mission launched title: "🎯 @creator launched a Mission!"
  {
    titlePattern: /^🎯\s*(.*?)\s+launched a Mission!$/i,
    bodyPattern: /.*/,
    translations: {
      es: (t) => ({
        title: `🎯 ¡${t?.[1] || 'Un creador'} lanzó una Misión!`,
        body: 'Necesita tu apoyo. Mira la meta y sé uno de los primeros patrocinadores.',
      }),
      fr: (t) => ({
        title: `🎯 ${t?.[1] || 'Un créateur'} a lancé une Mission !`,
        body: 'Il a besoin de votre soutien. Découvrez l\'objectif et soyez parmi les premiers contributeurs.',
      }),
      it: (t) => ({
        title: `🎯 ${t?.[1] || 'Un creator'} ha lanciato una Missione!`,
        body: 'Ha bisogno del tuo supporto. Guarda l\'obiettivo e sii tra i primi sostenitori.',
      }),
      pt: (t) => ({
        title: `🎯 ${t?.[1] || 'Um criador'} lançou uma Missão!`,
        body: 'Ele(a) precisa do seu apoio. Veja a meta e seja um dos primeiros apoiadores.',
      }),
    },
  },

  // 2. Follower: "@username started following you. Check out their profile." or "@username started following you."
  {
    titlePattern: /^(?:👤\s*)?New Follower!?$/i,
    bodyPattern: /^(.*?)\s+started following you(?:\.\s*Check out their profile\.?)?$/i,
    translations: {
      es: (_, b) => ({
        title: '👤 ¡Nuevo Seguidor!',
        body: `${b?.[1] || 'Alguien'} comenzó a seguirte. Revisa su perfil.`,
      }),
      fr: (_, b) => ({
        title: '👤 Nouveau Abonné !',
        body: `${b?.[1] || 'Quelqu\'un'} a commencé à vous suivre. Consultez son profil.`,
      }),
      it: (_, b) => ({
        title: '👤 Nuovo Follower!',
        body: `${b?.[1] || 'Qualcuno'} ha iniziato a seguirti. Guarda il suo profilo.`,
      }),
      pt: (_, b) => ({
        title: '👤 Novo Seguidor!',
        body: `${b?.[1] || 'Alguém'} começou a seguir você. Confira o perfil.`,
      }),
    },
  },

  // 3. Unfollowed: "@username unfollowed you."
  {
    titlePattern: /^Follower Unfollowed$/i,
    bodyPattern: /^(.*?)\s+unfollowed you\.?$/i,
    translations: {
      es: (_, b) => ({
        title: 'Seguidor te dejó de seguir',
        body: `${b?.[1] || 'Un usuario'} dejó de seguirte.`,
      }),
      fr: (_, b) => ({
        title: 'Abonné désabonné',
        body: `${b?.[1] || 'Un utilisateur'} ne vous suit plus.`,
      }),
      it: (_, b) => ({
        title: 'Non ti segue più',
        body: `${b?.[1] || 'Un utente'} ha smesso di seguirti.`,
      }),
      pt: (_, b) => ({
        title: 'Seguidor deixou de seguir',
        body: `${b?.[1] || 'Um usuário'} deixou de seguir você.`,
      }),
    },
  },

  // 4. Post Liked: "@username liked your post." or "@username liked your private circle post."
  {
    titlePattern: /^Post Liked$/i,
    bodyPattern: /^(.*?)\s+liked your (private circle post|post)\.?$/i,
    translations: {
      es: (_, b) => {
        const isCircle = b?.[2]?.includes('private circle');
        return {
          title: 'Publicación que te gusta',
          body: isCircle
            ? `${b?.[1] || 'A alguien'} le gustó tu publicación del círculo privado.`
            : `${b?.[1] || 'A alguien'} le gustó tu publicación.`,
        };
      },
      fr: (_, b) => {
        const isCircle = b?.[2]?.includes('private circle');
        return {
          title: 'Publication aimée',
          body: isCircle
            ? `${b?.[1] || 'Quelqu\'un'} a aimé votre publication de cercle privé.`
            : `${b?.[1] || 'Quelqu\'un'} a aimé votre publication.`,
        };
      },
      it: (_, b) => {
        const isCircle = b?.[2]?.includes('private circle');
        return {
          title: 'Mi piace al post',
          body: isCircle
            ? `A ${b?.[1] || 'qualcuno'} piace il tuo post del cerchio privato.`
            : `A ${b?.[1] || 'qualcuno'} piace il tuo post.`,
        };
      },
      pt: (_, b) => {
        const isCircle = b?.[2]?.includes('private circle');
        return {
          title: 'Publicação Curtida',
          body: isCircle
            ? `${b?.[1] || 'Alguém'} curtiu sua publicação do círculo privado.`
            : `${b?.[1] || 'Alguém'} curtiu sua publicação.`,
        };
      },
    },
  },

  // 5. New Comment: '@username commented on your post: "..."'
  {
    titlePattern: /^💬\s*New Comment$/i,
    bodyPattern: /^(.*?)\s+commented on your post:\s*"(.*)"$/is,
    translations: {
      es: (_, b) => ({
        title: '💬 Nuevo Comentario',
        body: `${b?.[1] || 'Alguien'} comentó en tu publicación: "${b?.[2] || ''}"`,
      }),
      fr: (_, b) => ({
        title: '💬 Nouveau Commentaire',
        body: `${b?.[1] || 'Quelqu\'un'} a commenté votre publication : "${b?.[2] || ''}"`,
      }),
      it: (_, b) => ({
        title: '💬 Nuovo Commento',
        body: `${b?.[1] || 'Qualcuno'} ha commentato il tuo post: "${b?.[2] || ''}"`,
      }),
      pt: (_, b) => ({
        title: '💬 Novo Comentário',
        body: `${b?.[1] || 'Alguém'} comentou na sua publicação: "${b?.[2] || ''}"`,
      }),
    },
  },

  // 6. Mentioned in post: "@username mentioned you in a post. Tap to see the context." or Battle post
  {
    titlePattern: /^📢\s*You were mentioned!$/i,
    bodyPattern: /^(.*?)\s+mentioned you in a (Battle post|post)\.\s*Tap to see the context\.?$/i,
    translations: {
      es: (_, b) => {
        const isBattle = b?.[2]?.toLowerCase().includes('battle');
        return {
          title: '📢 ¡Fuiste mencionado!',
          body: isBattle
            ? `${b?.[1] || 'Alguien'} te mencionó en una publicación de Batalla. Toca para ver el contexto.`
            : `${b?.[1] || 'Alguien'} te mencionó en una publicación. Toca para ver el contexto.`,
        };
      },
      fr: (_, b) => {
        const isBattle = b?.[2]?.toLowerCase().includes('battle');
        return {
          title: '📢 Vous avez été mentionné !',
          body: isBattle
            ? `${b?.[1] || 'Quelqu\'un'} vous a mentionné dans un post de Défi. Appuyez pour voir le contexte.`
            : `${b?.[1] || 'Quelqu\'un'} vous a mentionné dans une publication. Appuyez pour voir le contexte.`,
        };
      },
      it: (_, b) => {
        const isBattle = b?.[2]?.toLowerCase().includes('battle');
        return {
          title: '📢 Sei stato menzionato!',
          body: isBattle
            ? `${b?.[1] || 'Qualcuno'} ti ha menzionato in un post di Battaglia. Tocca per vedere il contesto.`
            : `${b?.[1] || 'Qualcuno'} ti ha menzionato in un post. Tocca per vedere il contesto.`,
        };
      },
      pt: (_, b) => {
        const isBattle = b?.[2]?.toLowerCase().includes('battle');
        return {
          title: '📢 Você foi mencionado!',
          body: isBattle
            ? `${b?.[1] || 'Alguém'} mencionou você em uma publicação de Batalha. Toque para ver o contexto.`
            : `${b?.[1] || 'Alguém'} mencionou você em uma publicação. Toque para ver o contexto.`,
        };
      },
    },
  },

  // 7. Tagged in a post / circle post
  {
    titlePattern: /^Tagged in a (post|private circle post)$/i,
    bodyPattern: /^(.*?)\s+tagged you in a (post|private circle post)\.?$/i,
    translations: {
      es: (t, b) => {
        const isCircle = (t?.[1] || b?.[2] || '').includes('circle');
        return {
          title: isCircle ? 'Etiquetado en un círculo privado' : 'Etiquetado en una publicación',
          body: isCircle
            ? `${b?.[1] || 'Alguien'} te etiquetó en una publicación de círculo privado.`
            : `${b?.[1] || 'Alguien'} te etiquetó en una publicación.`,
        };
      },
      fr: (t, b) => {
        const isCircle = (t?.[1] || b?.[2] || '').includes('circle');
        return {
          title: isCircle ? 'Identifié dans un cercle privé' : 'Identifié dans une publication',
          body: isCircle
            ? `${b?.[1] || 'Quelqu\'un'} vous a identifié dans un cercle privé.`
            : `${b?.[1] || 'Quelqu\'un'} vous a identifié dans une publication.`,
        };
      },
      it: (t, b) => {
        const isCircle = (t?.[1] || b?.[2] || '').includes('circle');
        return {
          title: isCircle ? 'Taggato in un cerchio privato' : 'Taggato in un post',
          body: isCircle
            ? `${b?.[1] || 'Qualcuno'} ti ha taggato in un post del cerchio privato.`
            : `${b?.[1] || 'Qualcuno'} ti ha taggato in un post.`,
        };
      },
      pt: (t, b) => {
        const isCircle = (t?.[1] || b?.[2] || '').includes('circle');
        return {
          title: isCircle ? 'Marcado em um círculo privado' : 'Marcado em uma publicação',
          body: isCircle
            ? `${b?.[1] || 'Alguém'} marcou você em uma publicação do círculo privado.`
            : `${b?.[1] || 'Alguém'} marcou você em uma publicação.`,
        };
      },
    },
  },

  // 8. Private circle: "You've Been Chosen" / "${ownerName} added you to their Private Circle."
  {
    titlePattern: /^"?You've Been Chosen"?$/i,
    bodyPattern: /^(.*?)\s+added you to their Private Circle\.?$/i,
    translations: {
      es: (_, b) => ({
        title: 'Has sido elegido',
        body: `${b?.[1] || 'Un creador'} te añadió a su Círculo Privado.`,
      }),
      fr: (_, b) => ({
        title: 'Vous avez été choisi',
        body: `${b?.[1] || 'Un créateur'} vous a ajouté à son Cercle Privé.`,
      }),
      it: (_, b) => ({
        title: 'Sei stato scelto',
        body: `${b?.[1] || 'Un creator'} ti ha aggiunto al suo Cerchio Privato.`,
      }),
      pt: (_, b) => ({
        title: 'Você foi escolhido',
        body: `${b?.[1] || 'Um criador'} adicionou você ao Círculo Privado dele(a).`,
      }),
    },
  },

  // 9. Circle is growing: "${joinedUserHandle} just joined your Private Circle. You now have ${totalMembers} members."
  {
    titlePattern: /^👥\s*Your Circle is growing!$/i,
    bodyPattern: /^(.*?)\s+just joined your Private Circle\.\s*You now have\s+(\d+)\s+members\.?$/i,
    translations: {
      es: (_, b) => ({
        title: '👥 ¡Tu Círculo está creciendo!',
        body: `${b?.[1] || 'Un nuevo miembro'} se acaba de unir a tu Círculo Privado. Ahora tienes ${b?.[2] || '0'} miembros.`,
      }),
      fr: (_, b) => ({
        title: '👥 Votre Cercle s\'agrandit !',
        body: `${b?.[1] || 'Un nouveau membre'} vient de rejoindre votre Cercle Privé. Vous avez maintenant ${b?.[2] || '0'} membres.`,
      }),
      it: (_, b) => ({
        title: '👥 Il tuo Cerchio sta crescendo!',
        body: `${b?.[1] || 'Un nuovo membro'} si è appena unito al tuo Cerchio Privato. Ora hai ${b?.[2] || '0'} membri.`,
      }),
      pt: (_, b) => ({
        title: '👥 Seu Círculo está crescendo!',
        body: `${b?.[1] || 'Um novo membro'} acabou de entrar no seu Círculo Privado. Você agora tem ${b?.[2] || '0'} membros.`,
      }),
    },
  },

  // 10. Private circle post: "${creatorHandle} just posted exclusive content for your Private Circle. Only you can see this."
  {
    titlePattern: /^🔐\s*New exclusive post in your Circle!$/i,
    bodyPattern: /^(.*?)\s+just posted exclusive content for your Private Circle\.\s*Only you can see this\.?$/i,
    translations: {
      es: (_, b) => ({
        title: '🔐 ¡Nueva publicación exclusiva en tu Círculo!',
        body: `${b?.[1] || 'Un creador'} acaba de publicar contenido exclusivo para tu Círculo Privado. Solo tú puedes ver esto.`,
      }),
      fr: (_, b) => ({
        title: '🔐 Nouvelle publication exclusive dans votre Cercle !',
        body: `${b?.[1] || 'Un créateur'} vient de publier du contenu exclusif pour votre Cercle Privé. Vous seul pouvez voir ceci.`,
      }),
      it: (_, b) => ({
        title: '🔐 Nuovo post esclusivo nel tuo Cerchio!',
        body: `${b?.[1] || 'Un creator'} ha appena pubblicato contenuti esclusivi per il tuo Cerchio Privato. Solo tu puoi vederlo.`,
      }),
      pt: (_, b) => ({
        title: '🔐 Nova publicação exclusiva no seu Círculo!',
        body: `${b?.[1] || 'Um criador'} acabou de postar conteúdo exclusivo para seu Círculo Privado. Apenas você pode ver isso.`,
      }),
    },
  },

  // 11. Private circle access removed: "You have been removed from ${ownerHandle}'s Private Circle. Exclusive content is no longer accessible."
  {
    titlePattern: /^🔓\s*Private Circle access removed\.?$/i,
    bodyPattern: /^You have been removed from (.*?)'s Private Circle\.\s*Exclusive content is no longer accessible\.?$/i,
    translations: {
      es: (_, b) => ({
        title: '🔓 Acceso al Círculo Privado eliminado.',
        body: `Has sido eliminado del Círculo Privado de ${b?.[1] || 'el creador'}. El contenido exclusivo ya no está accesible.`,
      }),
      fr: (_, b) => ({
        title: '🔓 Accès au Cercle Privé retiré.',
        body: `Vous avez été retiré du Cercle Privé de ${b?.[1] || 'le créateur'}. Le contenu exclusif n'est plus accessible.`,
      }),
      it: (_, b) => ({
        title: '🔓 Accesso al Cerchio Privato rimosso.',
        body: `Sei stato rimosso dal Cerchio Privato di ${b?.[1] || 'il creator'}. I contenuti esclusivi non sono più accessibili.`,
      }),
      pt: (_, b) => ({
        title: '🔓 Acesso ao Círculo Privado removido.',
        body: `Você foi removido do Círculo Privado de ${b?.[1] || 'o criador'}. O conteúdo exclusivo não está mais acessível.`,
      }),
    },
  },

  // 12. Drop trending: "${actorText} reacted to your Drop Story. It's getting traction!"
  {
    titlePattern: /^🎬\s*Your Drop is trending!$/i,
    bodyPattern: /^(.*?)\s+reacted to your Drop Story\.\s*It's getting traction!?$/i,
    translations: {
      es: (_, b) => ({
        title: '🎬 ¡Tu Drop es tendencia!',
        body: `${b?.[1] || 'Alguien'} reaccionó a tu Historia Drop. ¡Está ganando popularidad!`,
      }),
      fr: (_, b) => ({
        title: '🎬 Votre Drop est tendance !',
        body: `${b?.[1] || 'Quelqu\'un'} a réagi à votre Drop Story. Il prend de l'ampleur !`,
      }),
      it: (_, b) => ({
        title: '🎬 Il tuo Drop è di tendenza!',
        body: `${b?.[1] || 'Qualcuno'} ha reagito alla tua Storia Drop. Sta guadagnando popolarità!`,
      }),
      pt: (_, b) => ({
        title: '🎬 Seu Drop está em alta!',
        body: `${b?.[1] || 'Alguém'} reagiu ao seu Drop Story. Está ganhando destaque!`,
      }),
    },
  },

  // 13. Story views: "${viewerText} viewed your Story in the last hour."
  {
    titlePattern: /^👁\s*Your Story is Popular!$/i,
    bodyPattern: /^(.*?)\s+viewed your Story in the last hour\.?$/i,
    translations: {
      es: (_, b) => ({
        title: '👁 ¡Tu Historia es Popular!',
        body: `${b?.[1] || 'Un usuario'} vio tu Historia en la última hora.`,
      }),
      fr: (_, b) => ({
        title: '👁 Votre Histoire est populaire !',
        body: `${b?.[1] || 'Un utilisateur'} a vu votre Histoire au cours de la dernière heure.`,
      }),
      it: (_, b) => ({
        title: '👁 La tua Storia è Popolare!',
        body: `${b?.[1] || 'Un utente'} ha visualizzato la tua Storia nell'ultima ora.`,
      }),
      pt: (_, b) => ({
        title: '👁 Seu Story está Popular!',
        body: `${b?.[1] || 'Um usuário'} visualizou seu Story na última hora.`,
      }),
    },
  },

  // 14. Post credits low: "You have 1 post credit remaining. Upgrade to keep posting."
  {
    titlePattern: /^⚠️\s*1 Post Credit Left$/i,
    bodyPattern: /^You have 1 post credit remaining\.\s*Upgrade to keep posting\.?$/i,
    translations: {
      es: () => ({
        title: '⚠️ Queda 1 Crédito de Publicación',
        body: 'Te queda 1 crédito de publicación. Actualiza tu plan para seguir publicando.',
      }),
      fr: () => ({
        title: '⚠️ Plus qu\'un Crédit de Publication',
        body: 'Il vous reste 1 crédit de publication. Passez à l\'offre supérieure pour continuer à publier.',
      }),
      it: () => ({
        title: '⚠️ 1 Credito di Pubblicazione Rimasto',
        body: 'Ti è rimasto 1 credito di pubblicazione. Effettua l\'upgrade per continuare a pubblicare.',
      }),
      pt: () => ({
        title: '⚠️ Resta 1 Crédito de Publicação',
        body: 'Você tem 1 crédito de publicação restante. Faça upgrade para continuar postando.',
      }),
    },
  },

  // 15. Battle invite: "${inviterHandle} challenged you to a Battle. Review their side and argument."
  {
    titlePattern: /^Battle Invitation$/i,
    bodyPattern: /^(.*?)\s+challenged you to a Battle\.\s*Review their side and argument\.?$/i,
    translations: {
      es: (_, b) => ({
        title: 'Invitación a Batalla',
        body: `${b?.[1] || 'Alguien'} te desafió a una Batalla. Revisa su posición y argumento.`,
      }),
      fr: (_, b) => ({
        title: 'Invitation au Défi',
        body: `${b?.[1] || 'Quelqu\'un'} vous a défié pour une Batalla. Examinez son camp et son argument.`,
      }),
      it: (_, b) => ({
        title: 'Invito alla Battaglia',
        body: `${b?.[1] || 'Qualcuno'} ti ha sfidato a una Battaglia. Esamina la sua posizione e le sue argomentazioni.`,
      }),
      pt: (_, b) => ({
        title: 'Convite para Batalha',
        body: `${b?.[1] || 'Alguém'} desafiou você para uma Batalha. Veja o lado e argumento dele(a).`,
      }),
    },
  },

  // 16. Shop battle challenge: "${inviterName} challenged your shop to a battle."
  {
    titlePattern: /^Shop Battle Challenge$/i,
    bodyPattern: /^(.*?)\s+challenged your shop to a battle\.?$/i,
    translations: {
      es: (_, b) => ({
        title: 'Desafío de Batalla de Tienda',
        body: `${b?.[1] || 'Una tienda'} desafió a tu tienda a una batalla.`,
      }),
      fr: (_, b) => ({
        title: 'Défi de Boutique',
        body: `${b?.[1] || 'Une boutique'} a défié votre boutique pour une bataille.`,
      }),
      it: (_, b) => ({
        title: 'Sfida Battaglia Negozio',
        body: `${b?.[1] || 'Un negozio'} ha sfidato il tuo negozio a una battaglia.`,
      }),
      pt: (_, b) => ({
        title: 'Desafio de Batalha de Loja',
        body: `${b?.[1] || 'Uma loja'} desafiou sua loja para uma batalha.`,
      }),
    },
  },

  // 17. Shop battle accepted / declined
  {
    titlePattern: /^Shop Battle Accepted$/i,
    bodyPattern: /^A cross-shop battle challenge was accepted\.\s*The battle is ready\.?$/i,
    translations: {
      es: () => ({
        title: 'Batalla de Tienda Aceptada',
        body: 'El desafío de batalla entre tiendas fue aceptado. La batalla está lista.',
      }),
      fr: () => ({
        title: 'Défi de Boutique Accepté',
        body: 'Le défi de combat entre boutiques a été accepté. Le combat est prêt.',
      }),
      it: () => ({
        title: 'Battaglia Negozio Accettata',
        body: 'La sfida di battaglia tra negozi è stata accettata. La battaglia è pronta.',
      }),
      pt: () => ({
        title: 'Batalha de Loja Aceita',
        body: 'O desafio de batalha entre lojas foi aceito. A batalha está pronta.',
      }),
    },
  },
  {
    titlePattern: /^Shop Battle Declined$/i,
    bodyPattern: /^Your cross-shop battle challenge was declined\.\s*Stake points were refunded if any\.?$/i,
    translations: {
      es: () => ({
        title: 'Batalla de Tienda Rechazada',
        body: 'Tu desafío de batalla entre tiendas fue rechazado. Los puntos apostados fueron reembolsados.',
      }),
      fr: () => ({
        title: 'Défi de Boutique Refusé',
        body: 'Votre défi de combat entre boutiques a été refusé. Les points misés ont été remboursés.',
      }),
      it: () => ({
        title: 'Battaglia Negozio Rifiutata',
        body: 'La tua sfida tra negozi è stata rifiutata. I punti scommessi sono stati rimborsati.',
      }),
      pt: () => ({
        title: 'Batalha de Loja Recusada',
        body: 'Seu desafio de batalha entre lojas foi recusado. Os pontos apostados foram reembolsados.',
      }),
    },
  },

  // 18. Battle started
  {
    titlePattern: /^⚔️\s*Battle Started$/i,
    bodyPattern: /^The debate is live\.\s*See who joins your side\.?$/i,
    translations: {
      es: () => ({
        title: '⚔️ Batalla Iniciada',
        body: 'El debate está en vivo. Mira quién se une a tu lado.',
      }),
      fr: () => ({
        title: '⚔️ Défi Lancé',
        body: 'Le débat est en direct. Voyez qui rejoint votre camp.',
      }),
      it: () => ({
        title: '⚔️ Battaglia Iniziata',
        body: 'Il dibattito è aperto. Guarda chi si unisce alla tua fazione.',
      }),
      pt: () => ({
        title: '⚔️ Batalha Iniciada',
        body: 'O debate está ao vivo. Veja quem entra do seu lado.',
      }),
    },
  },

  // 19. New participants in battle: "${safeNewCount} new participants joined your Battle. See which side the community is backing."
  {
    titlePattern: /^👥\s*New Participants!$/i,
    bodyPattern: /^(.*?)\s+new participants joined your Battle\.\s*See which side the community is backing\.?$/i,
    translations: {
      es: (_, b) => ({
        title: '👥 ¡Nuevos Participantes!',
        body: `${b?.[1] || 'Varios'} nuevos participantes se unieron a tu Batalla. Mira qué lado apoya la comunidad.`,
      }),
      fr: (_, b) => ({
        title: '👥 Nouveaux Participants !',
        body: `${b?.[1] || 'De nouveaux'} participants ont rejoint votre combat. Voyez quel camp la communauté soutient.`,
      }),
      it: (_, b) => ({
        title: '👥 Nuovi Partecipanti!',
        body: `${b?.[1] || 'Nuovi'} partecipanti si sono uniti alla tua Battaglia. Guarda quale fazione sostiene la community.`,
      }),
      pt: (_, b) => ({
        title: '👥 Novos Participantes!',
        body: `${b?.[1] || 'Novos'} participantes entraram na sua Batalha. Veja qual lado a comunidade está apoiando.`,
      }),
    },
  },

  // 20. Battle closing soon: "Final votes are coming in. See the current outcome before time runs out."
  {
    titlePattern: /^⏳\s*Battle Closing Soon$/i,
    bodyPattern: /^Final votes are coming in\.\s*See the current outcome before time runs out\.?$/i,
    translations: {
      es: () => ({
        title: '⏳ La Batalla Termina Pronto',
        body: 'Se están recibiendo los votos finales. Revisa el resultado antes de que se agote el tiempo.',
      }),
      fr: () => ({
        title: '⏳ Fin du Défi Imminente',
        body: 'Les derniers votes arrivent. Découvrez le résultat avant la fin du temps.',
      }),
      it: () => ({
        title: '⏳ Battaglia in Chiusura',
        body: 'Stanno arrivando gli ultimi voti. Guarda l\'esito prima che scada il tempo.',
      }),
      pt: () => ({
        title: '⏳ Batalha Encerrando em Breve',
        body: 'Os votos finais estão chegando. Veja o resultado antes que o tempo acabe.',
      }),
    },
  },

  // 21. Battle completed: "See the final outcome and accuracy result for your Battle."
  {
    titlePattern: /^🏆\s*Battle Completed$/i,
    bodyPattern: /^See the final outcome and accuracy result for your Battle\.?$/i,
    translations: {
      es: () => ({
        title: '🏆 Batalla Completada',
        body: 'Mira el resultado final y la precisión de tu Batalla.',
      }),
      fr: () => ({
        title: '🏆 Défi Terminé',
        body: 'Découvrez le résultat final et la précision de votre défi.',
      }),
      it: () => ({
        title: '🏆 Battaglia Completata',
        body: 'Guarda l\'esito finale e il risultato di precisione della tua Battaglia.',
      }),
      pt: () => ({
        title: '🏆 Batalha Concluída',
        body: 'Veja o resultado final e a precisão da sua Batalha.',
      }),
    },
  },

  // 22. Battle declined: "The invited user declined your battle invite."
  {
    titlePattern: /^Battle Declined$/i,
    bodyPattern: /^The invited user declined your battle invite\.?$/i,
    translations: {
      es: () => ({
        title: 'Batalla Rechazada',
        body: 'El usuario invitado rechazó tu invitación a la batalla.',
      }),
      fr: () => ({
        title: 'Défi Refusé',
        body: 'L\'utilisateur invité a décliné votre invitation.',
      }),
      it: () => ({
        title: 'Battaglia Rifiutata',
        body: 'L\'utente invitato ha rifiutato il tuo invito alla battaglia.',
      }),
      pt: () => ({
        title: 'Batalha Recusada',
        body: 'O usuário convidado recusou seu convite para a batalha.',
      }),
    },
  },

  // 23. Battle invite expired: "Your battle was not accepted by ${safeName}."
  {
    titlePattern: /^Battle Invite Expired$/i,
    bodyPattern: /^Your battle was not accepted by (.*?)\.?$/i,
    translations: {
      es: (_, b) => ({
        title: 'Invitación a Batalla Expirada',
        body: `Tu batalla no fue aceptada por ${b?.[1] || 'el usuario invitado'}.`,
      }),
      fr: (_, b) => ({
        title: 'Invitation Expirée',
        body: `Votre défi n'a pas été accepté par ${b?.[1] || 'l\'utilisateur invité'}.`,
      }),
      it: (_, b) => ({
        title: 'Invito alla Battaglia Scaduto',
        body: `La tua battaglia non è stata accettata da ${b?.[1] || 'l\'utente invitato'}.`,
      }),
      pt: (_, b) => ({
        title: 'Convite de Batalha Expirado',
        body: `Sua batalha não foi aceita por ${b?.[1] || 'o usuário convidado'}.`,
      }),
    },
  },

  // 24. Battle result / closed
  {
    titlePattern: /^Battle Result$/i,
    bodyPattern: /^Your battle has ended\.\s*Check the results\.?$/i,
    translations: {
      es: () => ({
        title: 'Resultado de Batalla',
        body: 'Tu batalla ha finalizado. Revisa los resultados.',
      }),
      fr: () => ({
        title: 'Résultat du Défi',
        body: 'Votre défi est terminé. Consultez les résultats.',
      }),
      it: () => ({
        title: 'Risultato Battaglia',
        body: 'La tua battaglia è terminata. Controlla i risultati.',
      }),
      pt: () => ({
        title: 'Resultado da Batalha',
        body: 'Sua batalha terminou. Confira os resultados.',
      }),
    },
  },
  {
    titlePattern: /^Battle Closed$/i,
    bodyPattern: /^A battle you follow has ended\.\s*Check the results\.?$/i,
    translations: {
      es: () => ({
        title: 'Batalla Cerrada',
        body: 'Una batalla que sigues ha finalizado. Revisa los resultados.',
      }),
      fr: () => ({
        title: 'Défi Clôturé',
        body: 'Un défi que vous suivez est terminé. Consultez les résultats.',
      }),
      it: () => ({
        title: 'Battaglia Chiusa',
        body: 'Una battaglia che segui è terminata. Controlla i risultati.',
      }),
      pt: () => ({
        title: 'Batalha Encerrada',
        body: 'Uma batalha que você segue terminou. Confira os resultados.',
      }),
    },
  },

  // 25. Victory: "Your credibility score has increased. Check your updated achievements."
  {
    titlePattern: /^Victory! Your side won!$/i,
    bodyPattern: /^Your credibility score has increased\.\s*Check your updated achievements\.?$/i,
    translations: {
      es: () => ({
        title: '¡Victoria! ¡Tu lado ganó!',
        body: 'Tu puntuación de credibilidad ha aumentado. Revisa tus logros actualizados.',
      }),
      fr: () => ({
        title: 'Victoire ! Votre camp a gagné !',
        body: 'Votre score de crédibilité a augmenté. Consultez vos succès mis à jour.',
      }),
      it: () => ({
        title: 'Vittoria! La tua fazione ha vinto!',
        body: 'Il tuo punteggio di credibilità è aumentato. Controlla i tuoi obiettivi aggiornati.',
      }),
      pt: () => ({
        title: 'Vitória! Seu lado venceu!',
        body: 'Sua pontuação de credibilidade aumentou. Confira suas conquistas atualizadas.',
      }),
    },
  },

  // 26. Loss / forecast missed: "The outcome did not match your forecast. Review your accuracy."
  {
    titlePattern: /^Battle Result Updated$/i,
    bodyPattern: /^The outcome did not match your forecast\.\s*Review your accuracy\.?$/i,
    translations: {
      es: () => ({
        title: 'Resultado de Batalla Actualizado',
        body: 'El resultado no coincidió con tu pronóstico. Revisa tu precisión.',
      }),
      fr: () => ({
        title: 'Résultat Mis à Jour',
        body: 'Le résultat ne correspond pas à vos prévisions. Vérifiez votre précision.',
      }),
      it: () => ({
        title: 'Risultato Battaglia Aggiornato',
        body: 'L\'esito non corrisponde alla tua previsione. Verifica la tua precisione.',
      }),
      pt: () => ({
        title: 'Resultado de Batalha Atualizado',
        body: 'O resultado não correspondeu à sua previsão. Verifique sua precisão.',
      }),
    },
  },

  // 27. Leaderboard climbed: "See your new global ranking as a Forecaster on Valens."
  {
    titlePattern: /^You moved up the leaderboard!$/i,
    bodyPattern: /^See your new global ranking as a Forecaster on Valens\.?$/i,
    translations: {
      es: () => ({
        title: '¡Subiste en la clasificación!',
        body: 'Mira tu nueva posición global como Pronosticador en Valens.',
      }),
      fr: () => ({
        title: 'Vous avez progressé au classement !',
        body: 'Découvrez votre nouveau rang mondial de Pronostiqueur sur Valens.',
      }),
      it: () => ({
        title: 'Sei salito in classifica!',
        body: 'Guarda la tua nuova posizione globale come Previsore su Valens.',
      }),
      pt: () => ({
        title: 'Você subiu no ranking!',
        body: 'Veja sua nova posição global como Previsor no Valens.',
      }),
    },
  },

  // 28. New battle: "New battle: ..."
  {
    titlePattern: /^New Battle$/i,
    bodyPattern: /^New battle:\s*(.*)$/i,
    translations: {
      es: (_, b) => ({
        title: 'Nueva Batalla',
        body: `Nueva batalla: ${b?.[1] || ''}`,
      }),
      fr: (_, b) => ({
        title: 'Nouveau Défi',
        body: `Nouveau défi : ${b?.[1] || ''}`,
      }),
      it: (_, b) => ({
        title: 'Nuova Battaglia',
        body: `Nuova battaglia: ${b?.[1] || ''}`,
      }),
      pt: (_, b) => ({
        title: 'Nova Batalha',
        body: `Nova batalha: ${b?.[1] || ''}`,
      }),
    },
  },

  // 29. Milestones 25%, 50%, 75%
  {
    titlePattern: /^📈\s*Mission is 25% funded!$/i,
    bodyPattern: /^(.*?)\s+campaign just hit its first milestone\.\s*Help push it further!?$/i,
    translations: {
      es: (_, b) => ({
        title: '📈 ¡La Misión está financiada al 25%!',
        body: `La campaña de ${b?.[1] || 'el creador'} acaba de alcanzar su primer hito. ¡Ayuda a impulsarla más!`,
      }),
      fr: (_, b) => ({
        title: '📈 Mission financée à 25 % !',
        body: `La campagne de ${b?.[1] || 'le créateur'} vient d'atteindre son premier palier. Aidez à la propulser !`,
      }),
      it: (_, b) => ({
        title: '📈 Missione finanziata al 25%!',
        body: `La campagna di ${b?.[1] || 'il creator'} ha appena raggiunto il suo primo traguardo. Aiutala a crescere!`,
      }),
      pt: (_, b) => ({
        title: '📈 Missão 25% financiada!',
        body: `A campanha de ${b?.[1] || 'o criador'} acabou de atingir seu primeiro marco. Ajude a impulsionar ainda mais!`,
      }),
    },
  },
  {
    titlePattern: /^🔥\s*Halfway there! Mission is 50% funded\.?$/i,
    bodyPattern: /^(.*?)\s+campaign is gaining momentum\.\s*Share it with your network!?$/i,
    translations: {
      es: (_, b) => ({
        title: '🔥 ¡A mitad de camino! La Misión está al 50%.',
        body: `La campaña de ${b?.[1] || 'el creador'} está ganando impulso. ¡Compártela con tu red!`,
      }),
      fr: (_, b) => ({
        title: '🔥 À mi-chemin ! Mission financée à 50 %.',
        body: `La campagne de ${b?.[1] || 'le créateur'} prend de l'ampleur. Partagez-la avec votre réseau !`,
      }),
      it: (_, b) => ({
        title: '🔥 A metà strada! Missione finanziata al 50%.',
        body: `La campagna di ${b?.[1] || 'il creator'} sta prendendo slancio. Condividila con la tua rete!`,
      }),
      pt: (_, b) => ({
        title: '🔥 Metade do caminho! Missão 50% financiada.',
        body: `A campanha de ${b?.[1] || 'o criador'} está ganhando impulso. Compartilhe com sua rede!`,
      }),
    },
  },
  {
    titlePattern: /^⚡\s*Almost there! Mission is 75% funded\.?$/i,
    bodyPattern: /^Just 25% to go on (.*?)\s+Mission\.\s*One last push makes the difference\.?$/i,
    translations: {
      es: (_, b) => ({
        title: '⚡ ¡Casi listos! La Misión está al 75%.',
        body: `Solo queda el 25% en la Misión de ${b?.[1] || 'el creador'}. Un último empujón hace la diferencia.`,
      }),
      fr: (_, b) => ({
        title: '⚡ Presque là ! Mission financée à 75 %.',
        body: `Plus que 25 % pour la Mission de ${b?.[1] || 'le créateur'}. Un dernier effort fera la différence.`,
      }),
      it: (_, b) => ({
        title: '⚡ Quasi completata! Missione finanziata al 75%.',
        body: `Manca solo il 25% per la Missione di ${b?.[1] || 'il creator'}. Un ultimo sforzo fa la differenza.`,
      }),
      pt: (_, b) => ({
        title: '⚡ Quase lá! Missão 75% financiada.',
        body: `Faltam apenas 25% para a Missão de ${b?.[1] || 'o criador'}. Um último empurrão faz a diferença.`,
      }),
    },
  },

  // 30. New backer: "${backerHandle} contributed $${donation.amount} to your Mission. You're now ${fundedPercent}% funded!"
  {
    titlePattern: /^🏦\s*New Backer on your Mission!$/i,
    bodyPattern: /^(.*?)\s+contributed \$?([\d,.]+)\s+to your Mission\.\s*You're now\s+([\d,.]+)%\s+funded!?$/i,
    translations: {
      es: (_, b) => ({
        title: '🏦 ¡Nuevo Patrocinador en tu Misión!',
        body: `${b?.[1] || 'Un patrocinador'} contribuyó con $${b?.[2] || '0'} a tu Misión. ¡Ahora estás al ${b?.[3] || '0'}% financiado!`,
      }),
      fr: (_, b) => ({
        title: '🏦 Nouveau Soutien pour votre Mission !',
        body: `${b?.[1] || 'Un contributeur'} a contribué avec $${b?.[2] || '0'} à votre Mission. Vous êtes maintenant financé à ${b?.[3] || '0'} % !`,
      }),
      it: (_, b) => ({
        title: '🏦 Nuovo Sostenitore per la tua Missione!',
        body: `${b?.[1] || 'Un sostenitore'} ha contribuito con $${b?.[2] || '0'} alla tua Missione. Sei ora finanziato al ${b?.[3] || '0'}%!`,
      }),
      pt: (_, b) => ({
        title: '🏦 Novo Apoiador na sua Missão!',
        body: `${b?.[1] || 'Um apoiador'} contribuiu com $${b?.[2] || '0'} para sua Missão. Você está agora ${b?.[3] || '0'}% financiado!`,
      }),
    },
  },

  // 31. Mission fully funded (to creator): "Congratulations! Your campaign hit the $... goal. Payout is being processed."
  {
    titlePattern: /^🎉\s*Your Mission is FULLY FUNDED!$/i,
    bodyPattern: /^Congratulations!\s*Your campaign hit the \$?([\d,.]+)\s+goal\.\s*Payout is being processed\.?$/i,
    translations: {
      es: (_, b) => ({
        title: '🎉 ¡Tu Misión está TOTALMENTE FINANCIADA!',
        body: `¡Felicidades! Tu campaña alcanzó la meta de $${b?.[1] || '0'}. El pago se está procesando.`,
      }),
      fr: (_, b) => ({
        title: '🎉 Votre Mission est ENTIÈREMENT FINANCÉE !',
        body: `Félicitations ! Votre campagne a atteint l'objectif de $${b?.[1] || '0'}. Le paiement est en cours de traitement.`,
      }),
      it: (_, b) => ({
        title: '🎉 La tua Missione è COMPLETAMENTE FINANZIATA!',
        body: `Congratulazioni! La tua campagna ha raggiunto l'obiettivo di $${b?.[1] || '0'}. Il pagamento è in fase di elaborazione.`,
      }),
      pt: (_, b) => ({
        title: '🎉 Sua Missão está TOTALMENTE FINANCIADA!',
        body: `Parabéns! Sua campanha atingiu a meta de $${b?.[1] || '0'}. O pagamento está sendo processado.`,
      }),
    },
  },

  // 32. Mission fully funded (to backer): "${creatorHandle}'s Mission reached its goal! You helped make it happen. Thank you."
  {
    titlePattern: /^🎉\s*Mission Fully Funded!$/i,
    bodyPattern: /^(.*?)\s+Mission reached its goal!\s*You helped make it happen\.\s*Thank you\.?$/i,
    translations: {
      es: (_, b) => ({
        title: '🎉 ¡Misión Totalmente Financiada!',
        body: `¡La Misión de ${b?.[1] || 'el creador'} alcanzó su meta! Ayudaste a que esto fuera posible. ¡Gracias!`,
      }),
      fr: (_, b) => ({
        title: '🎉 Mission Entièrement Financée !',
        body: `La Mission de ${b?.[1] || 'le créateur'} a atteint son objectif ! Vous avez contribué à ce succès. Merci !`,
      }),
      it: (_, b) => ({
        title: '🎉 Missione Completamente Finanziata!',
        body: `La Missione di ${b?.[1] || 'il creator'} ha raggiunto il suo obiettivo! Hai contribuito a realizzarlo. Grazie!`,
      }),
      pt: (_, b) => ({
        title: '🎉 Missão Totalmente Financiada!',
        body: `A Missão de ${b?.[1] || 'o criador'} atingiu a meta! Você ajudou a tornar isso possível. Obrigado!`,
      }),
    },
  },

  // 33. Mission ending in 24 hours: "${creatorHandle}'s campaign closes tomorrow. Don't miss your chance to back it."
  {
    titlePattern: /^⏰\s*Mission ends in 24 hours!$/i,
    bodyPattern: /^(.*?)\s+campaign closes tomorrow\.\s*Don't miss your chance to back it\.?$/i,
    translations: {
      es: (_, b) => ({
        title: '⏰ ¡La Misión termina en 24 horas!',
        body: `La campaña de ${b?.[1] || 'el creador'} cierra mañana. No pierdas la oportunidad de apoyarla.`,
      }),
      fr: (_, b) => ({
        title: '⏰ La Mission se termine dans 24 heures !',
        body: `La campagne de ${b?.[1] || 'le créateur'} se termine demain. Ne manquez pas votre chance de la soutenir.`,
      }),
      it: (_, b) => ({
        title: '⏰ La Missione termina tra 24 ore!',
        body: `La campagna di ${b?.[1] || 'il creator'} si chiude domani. Non perdere l'occasione di sostenerla.`,
      }),
      pt: (_, b) => ({
        title: '⏰ A Missão termina em 24 horas!',
        body: `A campanha de ${b?.[1] || 'o criador'} encerra amanhã. Não perca a chance de apoiar.`,
      }),
    },
  },

  // 34. Contribution confirmed: "Your $${amountPaid} backing of ${creatorHandle}'s Mission is confirmed. Thank you for your support!"
  {
    titlePattern: /^✅\s*Contribution Confirmed!$/i,
    bodyPattern: /^Your \$?([\d,.]+)\s+backing of (.*?)\s+Mission is confirmed\.\s*Thank you for your support!?$/i,
    translations: {
      es: (_, b) => ({
        title: '✅ ¡Contribución Confirmada!',
        body: `Tu aporte de $${b?.[1] || '0'} a la Misión de ${b?.[2] || 'el creador'} está confirmado. ¡Gracias por tu apoyo!`,
      }),
      fr: (_, b) => ({
        title: '✅ Contribution Confirmée !',
        body: `Votre soutien de $${b?.[1] || '0'} pour la Mission de ${b?.[2] || 'le créateur'} est confirmé. Merci pour votre soutien !`,
      }),
      it: (_, b) => ({
        title: '✅ Contributo Confermato!',
        body: `Il tuo contributo di $${b?.[1] || '0'} per la Missione di ${b?.[2] || 'il creator'} è confermato. Grazie per il tuo supporto!`,
      }),
      pt: (_, b) => ({
        title: '✅ Contribuição Confirmada!',
        body: `Seu apoio de $${b?.[1] || '0'} para a Missão de ${b?.[2] || 'o criador'} está confirmado. Obrigado pelo seu apoio!`,
      }),
    },
  },

  // 35. Badge unlocked: "You reached ${followers} followers! Dralens evolved to ${tier} tier. Congrats!"
  {
    titlePattern: /^🥇\s*New Badge Unlocked!$/i,
    bodyPattern: /^You reached ([\d,.]+)\s+followers!\s*Dralens evolved to (.*?)\s+tier\.\s*Congrats!?$/i,
    translations: {
      es: (_, b) => ({
        title: '🥇 ¡Nueva Insignia Desbloqueada!',
        body: `¡Alcanzaste ${b?.[1] || '0'} seguidores! Dralens evolucionó al nivel ${b?.[2] || ''}. ¡Felicidades!`,
      }),
      fr: (_, b) => ({
        title: '🥇 Nouveau Badge Débloqué !',
        body: `Vous avez atteint ${b?.[1] || '0'} abonnés ! Dralens a évolué au niveau ${b?.[2] || ''}. Félicitations !`,
      }),
      it: (_, b) => ({
        title: '🥇 Nuovo Badge Sbloccato!',
        body: `Hai raggiunto ${b?.[1] || '0'} follower! Dralens si è evoluto al livello ${b?.[2] || ''}. Congratulazioni!`,
      }),
      pt: (_, b) => ({
        title: '🥇 Novo Emblema Desbloqueado!',
        body: `Você atingiu ${b?.[1] || '0'} seguidores! Dralens evoluiu para o nível ${b?.[2] || ''}. Parabéns!`,
      }),
    },
  },

  // 36. Order: "You have a new order" / "${buyerUsername} has placed a new order in your closet."
  {
    titlePattern: /^You have a new order$/i,
    bodyPattern: /^(.*?)\s+has placed a new order in your closet\.?$/i,
    translations: {
      es: (_, b) => ({
        title: 'Tienes un nuevo pedido',
        body: `${b?.[1] || 'Un comprador'} ha realizado un nuevo pedido en tu tienda.`,
      }),
      fr: (_, b) => ({
        title: 'Vous avez une nouvelle commande',
        body: `${b?.[1] || 'Un acheteur'} a passé une nouvelle commande dans votre boutique.`,
      }),
      it: (_, b) => ({
        title: 'Hai un nuovo ordine',
        body: `${b?.[1] || 'Un acquirente'} ha effettuato un nuovo ordine nel tuo negozio.`,
      }),
      pt: (_, b) => ({
        title: 'Você tem um novo pedido',
        body: `${b?.[1] || 'Um comprador'} fez um novo pedido na sua loja.`,
      }),
    },
  },

  // 37. Order prepared: "${sellerUsername} is preparing your order for shipment..." or pickup
  {
    titlePattern: /^Your Order is being prepared! 📦$/i,
    bodyPattern: /^(.*?)\s+is preparing your order for shipment.*$/is,
    translations: {
      es: (_, b) => ({
        title: '¡Tu pedido se está preparando! 📦',
        body: `${b?.[1] || 'El vendedor'} está preparando tu pedido para el envío. Te notificaremos cuando se envíe.`,
      }),
      fr: (_, b) => ({
        title: 'Votre commande est en préparation ! 📦',
        body: `${b?.[1] || 'Le vendeur'} prépare votre commande pour l'expédition. Nous vous préviendrons dès son envoi.`,
      }),
      it: (_, b) => ({
        title: 'Il tuo ordine è in preparazione! 📦',
        body: `${b?.[1] || 'Il venditore'} sta preparando il tuo ordine per la spedizione. Ti avviseremo non appena spedito.`,
      }),
      pt: (_, b) => ({
        title: 'Seu pedido está sendo preparado! 📦',
        body: `${b?.[1] || 'O vendedor'} está preparando seu pedido para envio. Avisaremos assim que for enviado.`,
      }),
    },
  },
  {
    titlePattern: /^Your Order is being prepared! 📦$/i,
    bodyPattern: /^(.*?)\s+is getting your order ready\.\s*Check your pickup details.*$/is,
    translations: {
      es: (_, b) => ({
        title: '¡Tu pedido se está preparando! 📦',
        body: `${b?.[1] || 'El vendedor'} está preparando tu pedido. Consulta los detalles de recogida y chatea con el vendedor si necesitas coordinar.`,
      }),
      fr: (_, b) => ({
        title: 'Votre commande est en préparation ! 📦',
        body: `${b?.[1] || 'Le vendeur'} prépare votre commande. Vérifiez les détails de retrait et échangez avec le vendeur si besoin.`,
      }),
      it: (_, b) => ({
        title: 'Il tuo ordine è in preparazione! 📦',
        body: `${b?.[1] || 'Il venditore'} sta preparando il tuo ordine. Controlla i dettagli del ritiro e contatta il venditore per coordinare.`,
      }),
      pt: (_, b) => ({
        title: 'Seu pedido está sendo preparado! 📦',
        body: `${b?.[1] || 'O vendedor'} está preparando seu pedido. Confira os detalhes de retirada e converse com o vendedor para combinar.`,
      }),
    },
  },

  // 38. Order shipped: "Your order has been shipped." or "... Tracking was validated with the carrier."
  {
    titlePattern: /^Order Shipped$/i,
    bodyPattern: /^Your order has been shipped\.(.*)?$/i,
    translations: {
      es: (_, b) => ({
        title: 'Pedido Enviado',
        body: b?.[1]?.includes('Tracking')
          ? 'Tu pedido ha sido enviado. El seguimiento fue validado con el transportista.'
          : 'Tu pedido ha sido enviado.',
      }),
      fr: (_, b) => ({
        title: 'Commande Expédiée',
        body: b?.[1]?.includes('Tracking')
          ? 'Votre commande a été expédiée. Le suivi a été validé auprès du transporteur.'
          : 'Votre commande a été expédiée.',
      }),
      it: (_, b) => ({
        title: 'Ordine Spedito',
        body: b?.[1]?.includes('Tracking')
          ? 'Il tuo ordine è stato spedito. Il tracciamento è stato convalidato dal corriere.'
          : 'Il tuo ordine è stato spedito.',
      }),
      pt: (_, b) => ({
        title: 'Pedido Enviado',
        body: b?.[1]?.includes('Tracking')
          ? 'Seu pedido foi enviado. O rastreamento foi validado com a transportadora.'
          : 'Seu pedido foi enviado.',
      }),
    },
  },

  // 39. Order delivered / confirm delivery
  {
    titlePattern: /^Order Delivered$/i,
    bodyPattern: /^Carrier confirmed delivery\.\s*Confirm receipt or report a problem within 48 hours\.?$/i,
    translations: {
      es: () => ({
        title: 'Pedido Entregado',
        body: 'El transportista confirmó la entrega. Confirma la recepción o reporta un problema en 48 horas.',
      }),
      fr: () => ({
        title: 'Commande Livrée',
        body: 'Le transporteur a confirmé la livraison. Confirmez la réception ou signalez un problème sous 48 heures.',
      }),
      it: () => ({
        title: 'Ordine Consegnato',
        body: 'Il corriere ha confermato la consegna. Conferma la ricezione o segnala un problema entro 48 ore.',
      }),
      pt: () => ({
        title: 'Pedido Entregue',
        body: 'A transportadora confirmou a entrega. Confirme o recebimento ou relate um problema em até 48 horas.',
      }),
    },
  },
  {
    titlePattern: /^Confirm your delivery$/i,
    bodyPattern: /^Your order was marked delivered\.?$/i,
    translations: {
      es: () => ({
        title: 'Confirma tu entrega',
        body: 'Tu pedido fue marcado como entregado.',
      }),
      fr: () => ({
        title: 'Confirmez votre livraison',
        body: 'Votre commande a été marquée comme livrée.',
      }),
      it: () => ({
        title: 'Conferma la consegna',
        body: 'Il tuo ordine è stato contrassegnato come consegnato.',
      }),
      pt: () => ({
        title: 'Confirme sua entrega',
        body: 'Seu pedido foi marcado como entregue.',
      }),
    },
  },
  {
    titlePattern: /^Delivered – Earnings Pending$/i,
    bodyPattern: /^Buyer has 48 hours to confirm\.\s*Earnings move to your available balance after the protection window\.?$/i,
    translations: {
      es: () => ({
        title: 'Entregado – Ganancias Pendientes',
        body: 'El comprador tiene 48 horas para confirmar. Las ganancias pasarán a tu saldo disponible tras el periodo de protección.',
      }),
      fr: () => ({
        title: 'Livré – Gains en Attente',
        body: 'L\'acheteur dispose de 48 heures pour confirmer. Les gains seront disponibles après la période de protection.',
      }),
      it: () => ({
        title: 'Consegnato – Guadagni in Sospeso',
        body: 'L\'acquirente ha 48 ore per confermare. I guadagni passeranno al saldo disponibile dopo il periodo di protezione.',
      }),
      pt: () => ({
        title: 'Entregue – Ganhos Pendentes',
        body: 'O comprador tem 48 horas para confirmar. Os ganhos passarão para o seu saldo disponível após o período de proteção.',
      }),
    },
  },
  {
    titlePattern: /^Earnings Available$/i,
    bodyPattern: /^Your marketplace earnings are now available to withdraw\.?$/i,
    translations: {
      es: () => ({
        title: 'Ganancias Disponibles',
        body: 'Tus ganancias del marketplace ya están disponibles para retirar.',
      }),
      fr: () => ({
        title: 'Gains Disponibles',
        body: 'Vos gains de la marketplace sont maintenant disponibles pour le retrait.',
      }),
      it: () => ({
        title: 'Guadagni Disponibili',
        body: 'I tuoi guadagni del marketplace sono ora disponibili per il prelievo.',
      }),
      pt: () => ({
        title: 'Ganhos Disponíveis',
        body: 'Seus ganhos do marketplace já estão disponíveis para saque.',
      }),
    },
  },
  {
    titlePattern: /^Delivery Exception$/i,
    bodyPattern: /^Carrier reported a delivery problem\.\s*Payout may be on hold\.?$/i,
    translations: {
      es: () => ({
        title: 'Excepción en la Entrega',
        body: 'El transportista informó de un problema en la entrega. El pago podría estar retenido.',
      }),
      fr: () => ({
        title: 'Problème de Livraison',
        body: 'Le transporteur a signalé un problème de livraison. Le paiement peut être suspendu.',
      }),
      it: () => ({
        title: 'Problema di Consegna',
        body: 'Il corriere ha segnalato un problema di consegna. Il pagamento potrebbe essere sospeso.',
      }),
      pt: () => ({
        title: 'Exceção na Entrega',
        body: 'A transportadora relatou um problema na entrega. O pagamento pode estar retido.',
      }),
    },
  },

  // 40. Pickup completed & Sale completed
  {
    titlePattern: /^🎉\s*Pickup Completed!$/i,
    bodyPattern: /^Your pickup was completed successfully\.\s*Thanks for shopping on Valens!?$/i,
    translations: {
      es: () => ({
        title: '🎉 ¡Recogida Completada!',
        body: 'Tu recogida se completó con éxito. ¡Gracias por comprar en Valens!',
      }),
      fr: () => ({
        title: '🎉 Retrait Effectué !',
        body: 'Votre retrait a été effectué avec succès. Merci d\'avoir fait vos achats sur Valens !',
      }),
      it: () => ({
        title: '🎉 Ritiro Completato!',
        body: 'Il tuo ritiro è stato completato con successo. Grazie per aver acquistato su Valens!',
      }),
      pt: () => ({
        title: '🎉 Retirada Concluída!',
        body: 'Sua retirada foi concluída com sucesso. Obrigado por comprar no Valens!',
      }),
    },
  },
  {
    titlePattern: /^🎉\s*Sale completed!$/i,
    bodyPattern: /^(.*?)\s+successfully picked up the order!\s*Thank you for selling on Valens!?$/i,
    translations: {
      es: (_, b) => ({
        title: '🎉 ¡Venta completada!',
        body: `¡${b?.[1] || 'El comprador'} recogió con éxito el pedido! ¡Gracias por vender en Valens!`,
      }),
      fr: (_, b) => ({
        title: '🎉 Vente terminée !',
        body: `${b?.[1] || 'L\'acheteur'} a retiré la commande avec succès ! Merci de vendre sur Valens !`,
      }),
      it: (_, b) => ({
        title: '🎉 Vendita completata!',
        body: `${b?.[1] || 'L\'acquirente'} ha ritirato con successo l'ordine! Grazie per aver venduto su Valens!`,
      }),
      pt: (_, b) => ({
        title: '🎉 Venda concluída!',
        body: `${b?.[1] || 'O comprador'} retirou o pedido com sucesso! Obrigado por vender no Valens!`,
      }),
    },
  },

  // 41. Chat message: "You have a new message in your marketplace chat."
  {
    titlePattern: /^New chat message$/i,
    bodyPattern: /^You have a new message in your marketplace chat\.?$/i,
    translations: {
      es: () => ({
        title: 'Nuevo mensaje de chat',
        body: 'Tienes un nuevo mensaje en el chat del marketplace.',
      }),
      fr: () => ({
        title: 'Nouveau message de discussion',
        body: 'Vous avez un nouveau message dans votre chat marketplace.',
      }),
      it: () => ({
        title: 'Nuovo messaggio in chat',
        body: 'Hai un nuovo messaggio nella chat del marketplace.',
      }),
      pt: () => ({
        title: 'Nova mensagem no chat',
        body: 'Você tem uma nova mensagem no chat do marketplace.',
      }),
    },
  },

  // 42. Platform Points Received: "${senderDisplayName} sent you ${transferAmount} platform points..."
  {
    titlePattern: /^Platform Points Received$/i,
    bodyPattern: /^(.*?)\s+sent you\s+([\d,.]+)\s+platform points(.*)$/i,
    translations: {
      es: (_, b) => ({
        title: 'Puntos de Plataforma Recibidos',
        body: `${b?.[1] || 'Alguien'} te envió ${b?.[2] || '0'} puntos de plataforma${b?.[3] || ''}`,
      }),
      fr: (_, b) => ({
        title: 'Points de Plateforme Reçus',
        body: `${b?.[1] || 'Quelqu\'un'} vous a envoyé ${b?.[2] || '0'} points de plateforme${b?.[3] || ''}`,
      }),
      it: (_, b) => ({
        title: 'Punti Piattaforma Ricevuti',
        body: `${b?.[1] || 'Qualcuno'} ti ha inviato ${b?.[2] || '0'} punti piattaforma${b?.[3] || ''}`,
      }),
      pt: (_, b) => ({
        title: 'Pontos da Plataforma Recebidos',
        body: `${b?.[1] || 'Alguém'} enviou para você ${b?.[2] || '0'} pontos da plataforma${b?.[3] || ''}`,
      }),
    },
  },

  // 43. Payout deposited / Withdrawal successful / failed
  {
    titlePattern: /^Payout Deposited$/i,
    bodyPattern: /^Your withdrawal of \$?([\d,.]+)\s+is being deposited to your bank\.?$/i,
    translations: {
      es: (_, b) => ({
        title: 'Pago Depositado',
        body: `Tu retiro de $${b?.[1] || '0'} está siendo depositado en tu banco.`,
      }),
      fr: (_, b) => ({
        title: 'Paiement Déposé',
        body: `Votre retrait de $${b?.[1] || '0'} est en cours de dépôt sur votre compte bancaire.`,
      }),
      it: (_, b) => ({
        title: 'Pagamento Depositato',
        body: `Il tuo prelievo di $${b?.[1] || '0'} è in fase di accredito sul tuo conto bancario.`,
      }),
      pt: (_, b) => ({
        title: 'Pagamento Depositado',
        body: `Seu saque de $${b?.[1] || '0'} está sendo depositado no seu banco.`,
      }),
    },
  },
  {
    titlePattern: /^Withdrawal Successful$/i,
    bodyPattern: /^Your withdrawal of ([\d,.]+)\s+(.*?)\s+has been sent to your connected account\.?$/i,
    translations: {
      es: (_, b) => ({
        title: 'Retiro Exitoso',
        body: `Tu retiro de ${b?.[1] || '0'} ${b?.[2] || ''} ha sido enviado a tu cuenta conectada.`,
      }),
      fr: (_, b) => ({
        title: 'Retrait Réussi',
        body: `Votre retrait de ${b?.[1] || '0'} ${b?.[2] || ''} a été envoyé sur votre compte associé.`,
      }),
      it: (_, b) => ({
        title: 'Prelievo Riuscito',
        body: `Il tuo prelievo di ${b?.[1] || '0'} ${b?.[2] || ''} è stato inviato al tuo conto collegato.`,
      }),
      pt: (_, b) => ({
        title: 'Saque Bem-sucedido',
        body: `Seu saque de ${b?.[1] || '0'} ${b?.[2] || ''} foi enviado para sua conta conectada.`,
      }),
    },
  },
  {
    titlePattern: /^Withdrawal Failed$/i,
    bodyPattern: /^Your withdrawal of \$?([\d,.]+)\s+failed and was returned to your available balance\.?$/i,
    translations: {
      es: (_, b) => ({
        title: 'Retiro Fallido',
        body: `Tu retiro de $${b?.[1] || '0'} falló y fue devuelto a tu saldo disponible.`,
      }),
      fr: (_, b) => ({
        title: 'Échec du Retrait',
        body: `Votre retrait de $${b?.[1] || '0'} a échoué et a été recrédité sur votre solde disponible.`,
      }),
      it: (_, b) => ({
        title: 'Prelievo Non Riuscito',
        body: `Il tuo prelievo di $${b?.[1] || '0'} non è riuscito ed è stato restituito al tuo saldo disponibile.`,
      }),
      pt: (_, b) => ({
        title: 'Falha no Saque',
        body: `Seu saque de $${b?.[1] || '0'} falhou e foi devolvido ao seu saldo disponível.`,
      }),
    },
  },
  {
    titlePattern: /^Payout Frozen$/i,
    bodyPattern: /^A buyer reported a problem\.\s*Your payout is on hold\.?$/i,
    translations: {
      es: () => ({
        title: 'Pago Retenido',
        body: 'Un comprador reportó un problema. Tu pago está en espera.',
      }),
      fr: () => ({
        title: 'Paiement Bloqué',
        body: 'Un acheteur a signalé un problème. Votre paiement est suspendu.',
      }),
      it: () => ({
        title: 'Pagamento Bloccato',
        body: 'Un acquirente ha segnalato un problema. Il tuo pagamento è in sospeso.',
      }),
      pt: () => ({
        title: 'Pagamento Bloqueado',
        body: 'Um comprador relatou um problema. Seu pagamento está retido.',
      }),
    },
  },
  {
    titlePattern: /^Bank Payout Issue$/i,
    bodyPattern: /^Your connected account payout to bank had an issue\..*$/i,
    translations: {
      es: () => ({
        title: 'Problema de Pago Bancario',
        body: 'Hubo un problema con el pago a tu cuenta bancaria conectada. Los fondos permanecen en tu cuenta Stripe; revisa tus datos bancarios.',
      }),
      fr: () => ({
        title: 'Problème de Paiement Bancaire',
        body: 'Un problème est survenu lors du virement vers votre compte bancaire. Les fonds restent sur votre compte Stripe ; vérifiez vos coordonnées bancaires.',
      }),
      it: () => ({
        title: 'Problema di Pagamento Bancario',
        body: 'Si è verificato un problema con il bonifico sul tuo conto bancario collegato. I fondi rimangono sul tuo conto Stripe; controlla i tuoi dati bancari.',
      }),
      pt: () => ({
        title: 'Problema no Pagamento Bancário',
        body: 'Houve um problema com a transferência para sua conta bancária conectada. Os fundos permanecem na sua conta Stripe; verifique seus dados bancários.',
      }),
    },
  },

  // 44. Subscription price updated: "${effectiveCreatorName} updated their monthly subscription price to $${newPrice}. Your auto-renewal has been paused."
  {
    titlePattern: /^Subscription Price Updated$/i,
    bodyPattern: /^(.*?)\s+updated their monthly subscription price to \$?([\d,.]+)\.\s*Your auto-renewal has been paused\.?$/i,
    translations: {
      es: (_, b) => ({
        title: 'Precio de Suscripción Actualizado',
        body: `${b?.[1] || 'El creador'} actualizó su precio de suscripción mensual a $${b?.[2] || '0'}. Tu renovación automática ha sido pausada.`,
      }),
      fr: (_, b) => ({
        title: 'Prix de l\'Abonnement Mis à Jour',
        body: `${b?.[1] || 'Le créateur'} a mis à jour le prix de son abonnement mensuel à $${b?.[2] || '0'}. Votre renouvellement automatique est suspendu.`,
      }),
      it: (_, b) => ({
        title: 'Prezzo Abbonamento Aggiornato',
        body: `${b?.[1] || 'Il creator'} ha aggiornato il prezzo dell'abbonamento mensile a $${b?.[2] || '0'}. Il rinnovo automatico è stato sospeso.`,
      }),
      pt: (_, b) => ({
        title: 'Preço da Assinatura Atualizado',
        body: `${b?.[1] || 'O criador'} atualizou o preço da assinatura mensal para $${b?.[2] || '0'}. Sua renovação automática foi pausada.`,
      }),
    },
  },

  // 45. Subscription auto-renewal cancelled: "Your auto-renewal for @${creatorName} has been cancelled. Your access will remain active until ${formattedEndDate}."
  {
    titlePattern: /^Subscription Autopay Cancelled$/i,
    bodyPattern: /^Your auto-renewal for @?(.*?)\s+has been cancelled\.\s*Your access will remain active until (.*?)\.?$/i,
    translations: {
      es: (_, b) => ({
        title: 'Pago Automático de Suscripción Cancelado',
        body: `Tu renovación automática para @${b?.[1] || ''} ha sido cancelada. Tu acceso permanecerá activo hasta el ${b?.[2] || ''}.`,
      }),
      fr: (_, b) => ({
        title: 'Renouvellement Automatique Annulé',
        body: `Votre renouvellement automatique pour @${b?.[1] || ''} a été annulé. Votre accès restera actif jusqu'au ${b?.[2] || ''}.`,
      }),
      it: (_, b) => ({
        title: 'Rinnovo Automatico Annullato',
        body: `Il tuo rinnovo automatico per @${b?.[1] || ''} è stato annullato. Il tuo accesso rimarrà attivo fino al ${b?.[2] || ''}.`,
      }),
      pt: (_, b) => ({
        title: 'Renovação Automática Cancelada',
        body: `Sua renovação automática para @${b?.[1] || ''} foi cancelada. Seu acesso permanecerá ativo até ${b?.[2] || ''}.`,
      }),
    },
  },

  // 46. Subscription ended: "Your subscription to @${creatorName} has ended."
  {
    titlePattern: /^Subscription Ended$/i,
    bodyPattern: /^Your subscription to @?(.*?)\s+has ended\.?$/i,
    translations: {
      es: (_, b) => ({
        title: 'Suscripción Finalizada',
        body: `Tu suscripción a @${b?.[1] || ''} ha finalizado.`,
      }),
      fr: (_, b) => ({
        title: 'Abonnement Terminé',
        body: `Votre abonnement à @${b?.[1] || ''} est terminé.`,
      }),
      it: (_, b) => ({
        title: 'Abbonamento Terminato',
        body: `Il tuo abbonamento a @${b?.[1] || ''} è terminato.`,
      }),
      pt: (_, b) => ({
        title: 'Assinatura Encerrada',
        body: `Sua assinatura de @${b?.[1] || ''} foi encerrada.`,
      }),
    },
  },

  // 47. Tokens Credited: "You have successfully received {amount} tokens."
  {
    titlePattern: /^Tokens Credited$/i,
    bodyPattern: /^You have successfully received ([\d,.]+)\s+tokens\.?$/i,
    translations: {
      es: (_, b) => ({
        title: 'Tokens Acreditados',
        body: `Has recibido con éxito ${b?.[1] || '0'} tokens.`,
      }),
      fr: (_, b) => ({
        title: 'Jetons Crédités',
        body: `Vous avez reçu avec succès ${b?.[1] || '0'} jetons.`,
      }),
      it: (_, b) => ({
        title: 'Token Accreditati',
        body: `Hai ricevuto con successo ${b?.[1] || '0'} token.`,
      }),
      pt: (_, b) => ({
        title: 'Tokens Creditados',
        body: `Você recebeu com sucesso ${b?.[1] || '0'} tokens.`,
      }),
    },
  },

  // 48. Tokens Received: "You received {amount} tokens from {sender}."
  {
    titlePattern: /^Tokens Received$/i,
    bodyPattern: /^You received ([\d,.]+)\s+tokens from (.*?)\.?$/i,
    translations: {
      es: (_, b) => ({
        title: 'Tokens Recibidos',
        body: `Recibiste ${b?.[1] || '0'} tokens de ${b?.[2] || 'alguien'}.`,
      }),
      fr: (_, b) => ({
        title: 'Jetons Reçus',
        body: `Vous avez reçu ${b?.[1] || '0'} jetons de ${b?.[2] || 'quelqu\'un'}.`,
      }),
      it: (_, b) => ({
        title: 'Token Ricevuti',
        body: `Hai ricevuto ${b?.[1] || '0'} token da ${b?.[2] || 'qualcuno'}.`,
      }),
      pt: (_, b) => ({
        title: 'Tokens Recebidos',
        body: `Você recebeu ${b?.[1] || '0'} tokens de ${b?.[2] || 'alguém'}.`,
      }),
    },
  },
];

// ---------------------------------------------------------------------------
// Reverse Translation Engine (Multi-Language -> Canonical English)
// ---------------------------------------------------------------------------

// Build inverted title map: (any translated title -> Canonical English title)
const REVERSE_TITLE_MAP: Record<string, string> = {};
for (const [enTitle, translations] of Object.entries(TITLE_MAP)) {
  REVERSE_TITLE_MAP[enTitle.toLowerCase().trim()] = enTitle;
  for (const translated of Object.values(translations)) {
    if (typeof translated === 'string' && translated.trim()) {
      REVERSE_TITLE_MAP[translated.toLowerCase().trim()] = enTitle;
    }
  }
}

interface ReversePatternRule {
  bodyPatterns: RegExp[];
  toEnglishBody: (match: RegExpMatchArray, data?: Record<string, any>) => string;
  defaultEnglishTitle?: string;
}

const REVERSE_BODY_RULES: ReversePatternRule[] = [
  // 1. Post Liked
  {
    defaultEnglishTitle: 'Post Liked',
    bodyPatterns: [
      /^(.*?)\s+curtiu sua publicação(?:\s+do círculo privado)?\.?$/i,
      /^A\s+(.*?)\s+le gustó tu publicación(?:\s+del círculo privado)?\.?$/i,
      /^(.*?)\s+a aimé votre publication(?:\s+de cercle privé)?\.?$/i,
      /^A\s+(.*?)\s+piace il tuo post(?:\s+del cerchio privato)?\.?$/i,
      /^(.*?)\s+liked your (private circle post|post)\.?$/i,
    ],
    toEnglishBody: (match, data) => {
      const isCircle = data?.isPrivateCircle || match[0]?.toLowerCase().includes('círculo') || match[0]?.toLowerCase().includes('cerchio') || match[0]?.toLowerCase().includes('cercle') || match[0]?.toLowerCase().includes('circle');
      return `${match[1] || 'Someone'} liked your ${isCircle ? 'private circle post.' : 'post.'}`;
    },
  },

  // 2. Follower
  {
    defaultEnglishTitle: '👤 New Follower!',
    bodyPatterns: [
      /^(.*?)\s+começou a seguir você(?:\.\s*Confira o perfil\.?)?$/i,
      /^(.*?)\s+comenzó a seguirte(?:\.\s*Revisa su perfil\.?)?$/i,
      /^(.*?)\s+a commencé à vous suivre(?:\.\s*Consultez son profil\.?)?$/i,
      /^(.*?)\s+ha iniziato a seguirti(?:\.\s*Guarda il suo profilo\.?)?$/i,
      /^(.*?)\s+started following you(?:\.\s*Check out their profile\.?)?$/i,
    ],
    toEnglishBody: (match) => `${match[1] || 'Someone'} started following you. Check out their profile.`,
  },

  // 3. Unfollowed
  {
    defaultEnglishTitle: 'Follower Unfollowed',
    bodyPatterns: [
      /^(.*?)\s+deixou de seguir você\.?$/i,
      /^(.*?)\s+dejó de seguirte\.?$/i,
      /^(.*?)\s+ne vous suit plus\.?$/i,
      /^(.*?)\s+ha smesso di seguirti\.?$/i,
      /^(.*?)\s+unfollowed you\.?$/i,
    ],
    toEnglishBody: (match) => `${match[1] || 'Someone'} unfollowed you.`,
  },

  // 4. New Comment
  {
    defaultEnglishTitle: '💬 New Comment',
    bodyPatterns: [
      /^(.*?)\s+comentou na sua publicação:\s*"(.*)"$/is,
      /^(.*?)\s+comentó en tu publicación:\s*"(.*)"$/is,
      /^(.*?)\s+a commenté votre publication\s*:\s*"(.*)"$/is,
      /^(.*?)\s+ha commentato il tuo post:\s*"(.*)"$/is,
      /^(.*?)\s+commented on your post:\s*"(.*)"$/is,
    ],
    toEnglishBody: (match) => `${match[1] || 'Someone'} commented on your post: "${match[2] || ''}"`,
  },

  // 5. Mentioned
  {
    defaultEnglishTitle: '📢 You were mentioned!',
    bodyPatterns: [
      /^(.*?)\s+mencionou você em um comentário:\s*"(.*)"$/is,
      /^(.*?)\s+te mencionó en un comentario:\s*"(.*)"$/is,
      /^(.*?)\s+vous a mentionné dans un commentaire\s*:\s*"(.*)"$/is,
      /^(.*?)\s+ti ha menzionato in un commento:\s*"(.*)"$/is,
      /^(.*?)\s+mentioned you in a comment:\s*"(.*)"$/is,
    ],
    toEnglishBody: (match) => `${match[1] || 'Someone'} mentioned you in a comment: "${match[2] || ''}"`,
  },

  // 6. Tokens Received
  {
    defaultEnglishTitle: 'Tokens Received',
    bodyPatterns: [
      /^Você recebeu ([\d,.]+)\s+tokens de (.*?)\.?$/i,
      /^Recibiste ([\d,.]+)\s+tokens de (.*?)\.?$/i,
      /^Vous avez reçu ([\d,.]+)\s+jetons de (.*?)\.?$/i,
      /^Hai ricevuto ([\d,.]+)\s+token da (.*?)\.?$/i,
      /^You received ([\d,.]+)\s+tokens from (.*?)\.?$/i,
    ],
    toEnglishBody: (match) => `You received ${match[1] || '0'} tokens from ${match[2] || 'someone'}.`,
  },

  // 7. Tokens Credited
  {
    defaultEnglishTitle: 'Tokens Credited',
    bodyPatterns: [
      /^Você recebeu ([\d,.]+)\s+tokens creditados\.?$/i,
      /^Se te acreditaron ([\d,.]+)\s+tokens\.?$/i,
      /^Vous avez été crédité de ([\d,.]+)\s+jetons\.?$/i,
      /^Ti sono stati accreditati ([\d,.]+)\s+token\.?$/i,
      /^You were credited ([\d,.]+)\s+tokens\.?$/i,
    ],
    toEnglishBody: (match) => `You were credited ${match[1] || '0'} tokens.`,
  },

  // 8. Mission Donation
  {
    defaultEnglishTitle: 'Mission Donation',
    bodyPatterns: [
      /^(.*?)\s+doou \$?([\d,.]+)\s+para a sua publicação\.?$/i,
      /^(.*?)\s+donó \$?([\d,.]+)\s+a tu publicación\.?$/i,
      /^(.*?)\s+a fait un don de \$?([\d,.]+)\s+à votre publication\.?$/i,
      /^(.*?)\s+ha donato \$?([\d,.]+)\s+al tuo post\.?$/i,
      /^(.*?)\s+donated \$?([\d,.]+)\s+to your post\.?$/i,
    ],
    toEnglishBody: (match) => `${match[1] || 'Someone'} donated $${match[2] || '0'} to your post.`,
  },

  // 9. Following Payment
  {
    defaultEnglishTitle: 'Following Payment',
    bodyPatterns: [
      /^(.*?)\s+comprou sua assinatura de conteúdo privado\.?$/i,
      /^(.*?)\s+compró tu suscripción de contenido privado\.?$/i,
      /^(.*?)\s+a acheté votre abonnement à du contenu privé\.?$/i,
      /^(.*?)\s+ha acquistato il tuo abbonamento a contenuti privati\.?$/i,
      /^(.*?)\s+bought your private content subscription\.?$/i,
    ],
    toEnglishBody: (match) => `${match[1] || 'Someone'} bought your private content subscription.`,
  },

  // 10. Tagged in a post
  {
    defaultEnglishTitle: 'Tagged in a post',
    bodyPatterns: [
      /^(.*?)\s+marcou você em uma publicação(?:\s+do círculo privado)?\.?$/i,
      /^(.*?)\s+te etiquetó en una publicación(?:\s+del círculo privado)?\.?$/i,
      /^(.*?)\s+vous a identifié dans une publication(?:\s+de cercle privé)?\.?$/i,
      /^(.*?)\s+ti ha taggato in un post(?:\s+del cerchio privato)?\.?$/i,
      /^(.*?)\s+tagged you in a (post|private circle post)\.?$/i,
    ],
    toEnglishBody: (match, data) => {
      const isCircle = data?.isPrivateCircle || match[0]?.toLowerCase().includes('círculo') || match[0]?.toLowerCase().includes('cerchio') || match[0]?.toLowerCase().includes('cercle') || match[0]?.toLowerCase().includes('circle');
      return `${match[1] || 'Someone'} tagged you in a ${isCircle ? 'private circle post.' : 'post.'}`;
    },
  },

  // 11. Battle Invitation
  {
    defaultEnglishTitle: 'Battle Invitation',
    bodyPatterns: [
      /^(.*?)\s+desafiou você para uma Batalha\.\s*Revise o lado e argumento dela\.?$/i,
      /^(.*?)\s+te desafió a una Batalla\.\s*Revisa su postura y argumento\.?$/i,
      /^(.*?)\s+vous a défié pour un Défi\.\s*Consultez son camp et son argument\.?$/i,
      /^(.*?)\s+ti ha sfidato a una Battaglia\.\s*Controlla la sua fazione e tesi\.?$/i,
      /^(.*?)\s+challenged you to a Battle\.\s*Review their side and argument\.?$/i,
    ],
    toEnglishBody: (match) => `${match[1] || 'Someone'} challenged you to a Battle. Review their side and argument.`,
  },

  // 12. Shop Battle Challenge
  {
    defaultEnglishTitle: 'Shop Battle Challenge',
    bodyPatterns: [
      /^(.*?)\s+desafiou sua loja para uma batalha\.?$/i,
      /^(.*?)\s+desafió a tu tienda a una batalla\.?$/i,
      /^(.*?)\s+a défié votre boutique pour un défi\.?$/i,
      /^(.*?)\s+ha sfidato il tuo negozio a una battaglia\.?$/i,
      /^(.*?)\s+challenged your shop to a battle\.?$/i,
    ],
    toEnglishBody: (match) => `${match[1] || 'A shop'} challenged your shop to a battle.`,
  },

  // 13. Orders: Placed
  {
    defaultEnglishTitle: 'Order Placed Successfully',
    bodyPatterns: [
      /^Seu pedido (?:#([^\s]+)\s+)?foi realizado com sucesso\.?$/i,
      /^Tu pedido (?:#([^\s]+)\s+)?ha sido realizado con éxito\.?$/i,
      /^Votre commande (?:#([^\s]+)\s+)?a été passée avec succès\.?$/i,
      /^Il tuo ordine (?:#([^\s]+)\s+)?è stato effettuato con successo\.?$/i,
      /^Your order (?:#([^\s]+)\s+)?has been placed successfully\.?$/i,
    ],
    toEnglishBody: (match, data) => {
      const orderId = match[1] || data?.orderId || '';
      return orderId ? `Your order #${orderId} has been placed successfully.` : 'Your order has been placed successfully.';
    },
  },

  // 14. Orders: New Order for seller
  {
    defaultEnglishTitle: 'You have a new order',
    bodyPatterns: [
      /^Você recebeu um novo pedido (?:#([^\s]+))?\.?$/i,
      /^Has recibido un nuevo pedido (?:#([^\s]+))?\.?$/i,
      /^Vous avez reçu une nouvelle commande (?:#([^\s]+))?\.?$/i,
      /^Hai ricevuto un nuovo ordine (?:#([^\s]+))?\.?$/i,
      /^You received a new order (?:#([^\s]+))?\.?$/i,
    ],
    toEnglishBody: (match, data) => {
      const orderId = match[1] || data?.orderId || '';
      return orderId ? `You received a new order #${orderId}.` : 'You received a new order.';
    },
  },

  // 15. Orders: Shipped
  {
    defaultEnglishTitle: 'Order Shipped',
    bodyPatterns: [
      /^Seu pedido (?:#([^\s]+)\s+)?foi enviado\.?$/i,
      /^Tu pedido (?:#([^\s]+)\s+)?ha sido enviado\.?$/i,
      /^Votre commande (?:#([^\s]+)\s+)?a été expédiée\.?$/i,
      /^Il tuo ordine (?:#([^\s]+)\s+)?è stato spedito\.?$/i,
      /^Your order (?:#([^\s]+)\s+)?has been shipped\.?$/i,
    ],
    toEnglishBody: (match, data) => {
      const orderId = match[1] || data?.orderId || '';
      return orderId ? `Your order #${orderId} has been shipped.` : 'Your order has been shipped.';
    },
  },

  // 16. Orders: Delivered
  {
    defaultEnglishTitle: 'Order Delivered',
    bodyPatterns: [
      /^Seu pedido (?:#([^\s]+)\s+)?foi entregue\.?$/i,
      /^Tu pedido (?:#([^\s]+)\s+)?ha sido entregado\.?$/i,
      /^Votre commande (?:#([^\s]+)\s+)?a été livrée\.?$/i,
      /^Il tuo ordine (?:#([^\s]+)\s+)?è stato consegnato\.?$/i,
      /^Your order (?:#([^\s]+)\s+)?has been delivered\.?$/i,
    ],
    toEnglishBody: (match, data) => {
      const orderId = match[1] || data?.orderId || '';
      return orderId ? `Your order #${orderId} has been delivered.` : 'Your order has been delivered.';
    },
  },

  // 17. Orders: Cancelled
  {
    defaultEnglishTitle: 'Order Cancelled',
    bodyPatterns: [
      /^Seu pedido (?:#([^\s]+)\s+)?foi cancelado\.?$/i,
      /^Tu pedido (?:#([^\s]+)\s+)?ha sido cancelado\.?$/i,
      /^Votre commande (?:#([^\s]+)\s+)?a été annulée\.?$/i,
      /^Il tuo ordine (?:#([^\s]+)\s+)?è stato annullato\.?$/i,
      /^Your order (?:#([^\s]+)\s+)?has been cancelled\.?$/i,
    ],
    toEnglishBody: (match, data) => {
      const orderId = match[1] || data?.orderId || '';
      return orderId ? `Your order #${orderId} has been cancelled.` : 'Your order has been cancelled.';
    },
  },

  // 18. Badge unlocked
  {
    defaultEnglishTitle: '🥇 New Badge Unlocked!',
    bodyPatterns: [
      /^Parabéns!\s*Você desbloqueou o emblema "(.*?)"\.?$/i,
      /^¡Felicitaciones!\s*Has desbloqueado la insignia "(.*?)"\.?$/i,
      /^Félicitations !\s*Vous avez débloqué le badge «\s*(.*?)\s*»\.?$/i,
      /^Congratulazioni!\s*Hai sbloccato il badge "(.*?)"\.?$/i,
      /^Congratulations!\s*You unlocked the "(.*?)" badge\.?$/i,
    ],
    toEnglishBody: (match) => `Congratulations! You unlocked the "${match[1] || ''}" badge.`,
  },
];

/**
 * Main translation function (English -> Target Language)
 */
export function translateNotification(
  title: string,
  body: string,
  targetLang?: string,
  data?: Record<string, any>,
): TranslatedNotification {
  const lang = (targetLang || 'en').toLowerCase().trim() as SupportedLanguage;

  if (lang === 'en' || !['es', 'fr', 'it', 'pt'].includes(lang)) {
    return { title, body };
  }

  const safeTitle = (title || '').trim();
  const safeBody = (body || '').trim();

  // 1. Check pattern rules
  for (const rule of PATTERN_RULES) {
    const titleMatch = typeof rule.titlePattern === 'string'
      ? (safeTitle.toLowerCase() === rule.titlePattern.toLowerCase() ? [safeTitle] as unknown as RegExpMatchArray : null)
      : safeTitle.match(rule.titlePattern);

    if (titleMatch) {
      const bodyMatch = typeof rule.bodyPattern === 'string'
        ? (safeBody.toLowerCase() === rule.bodyPattern.toLowerCase() ? [safeBody] as unknown as RegExpMatchArray : null)
        : safeBody.match(rule.bodyPattern);

      if (bodyMatch) {
        try {
          const result = rule.translations[lang](titleMatch, bodyMatch, data);
          if (result && result.title && result.body) {
            return result;
          }
        } catch {
          // fallback to next matching rule
        }
      }
    }
  }

  // 2. Check title exact map
  let translatedTitle = safeTitle;
  if (TITLE_MAP[safeTitle] && TITLE_MAP[safeTitle][lang]) {
    translatedTitle = TITLE_MAP[safeTitle][lang];
  }

  // If title was translated but no body rule matched, return translated title with original body
  return {
    title: translatedTitle,
    body: safeBody,
  };
}

/**
 * Reverse translates any localized notification (pt, es, fr, it) back to canonical English.
 */
export function reverseTranslateToEnglish(
  title: string,
  body: string,
  data?: Record<string, any>,
): TranslatedNotification {
  const safeTitle = (title || '').trim();
  const safeBody = (body || '').trim();

  // 1. Resolve Title to English
  let enTitle = safeTitle;
  const lowerTitle = safeTitle.toLowerCase();
  if (REVERSE_TITLE_MAP[lowerTitle]) {
    enTitle = REVERSE_TITLE_MAP[lowerTitle];
  }

  // 2. Resolve Body to English
  let enBody = safeBody;
  for (const rule of REVERSE_BODY_RULES) {
    for (const pattern of rule.bodyPatterns) {
      const match = safeBody.match(pattern);
      if (match) {
        enBody = rule.toEnglishBody(match, data);
        if (rule.defaultEnglishTitle && (!enTitle || enTitle === safeTitle)) {
          enTitle = rule.defaultEnglishTitle;
        }
        return { title: enTitle, body: enBody };
      }
    }
  }

  return { title: enTitle, body: enBody };
}

/**
 * Localizes any notification object (whether new with rawTitle/rawBody in data or legacy DB row)
 * into the requested target language (en, pt, es, fr, it).
 */
export function localizeNotification<T extends { title: string; body: string; data?: any }>(
  notification: T,
  targetLang?: string,
): T {
  const lang = (targetLang || 'en').toLowerCase().trim();
  const notifData = notification.data as Record<string, any> | null | undefined;

  let canonicalEnglishTitle = notifData?.rawTitle as string | undefined;
  let canonicalEnglishBody = notifData?.rawBody as string | undefined;

  // If raw English template was preserved in data:
  if (canonicalEnglishTitle && canonicalEnglishBody) {
    if (lang === 'en') {
      return {
        ...notification,
        title: canonicalEnglishTitle,
        body: canonicalEnglishBody,
      };
    }
    const translated = translateNotification(canonicalEnglishTitle, canonicalEnglishBody, lang, notifData || {});
    return {
      ...notification,
      title: translated.title,
      body: translated.body,
    };
  }

  // Legacy row without rawTitle/rawBody: reverse-translate to canonical English first
  const reversed = reverseTranslateToEnglish(notification.title, notification.body, notifData || {});
  canonicalEnglishTitle = reversed.title;
  canonicalEnglishBody = reversed.body;

  if (lang === 'en') {
    return {
      ...notification,
      title: canonicalEnglishTitle,
      body: canonicalEnglishBody,
    };
  }

  const translated = translateNotification(canonicalEnglishTitle, canonicalEnglishBody, lang, notifData || {});
  return {
    ...notification,
    title: translated.title,
    body: translated.body,
  };
}

