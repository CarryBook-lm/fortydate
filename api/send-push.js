import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE
);

webpush.setVapidDetails(
  process.env.VAPID_SUBJECT || 'mailto:contact@fortydate.com',
  process.env.VITE_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '\u2026' : str;
}

async function getPrenom(userId) {
  if (!userId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('prenom')
    .eq('id', userId)
    .single();
  return (data && data.prenom) || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method not allowed' });
  }

  // Securite optionnelle : si WEBHOOK_SECRET est defini cote Vercel,
  // le webhook Supabase doit envoyer le meme header x-webhook-secret.
  const secret = process.env.WEBHOOK_SECRET;
  if (secret && req.headers['x-webhook-secret'] !== secret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const table = body && body.table;
  const record = body && body.record;
  if (!body || body.type !== 'INSERT' || !record) {
    return res.status(200).json({ skipped: 'not an insert' });
  }

  // Determine destinataire + contenu de la notif selon la table
  let recipientId = null;
  let senderId = null;
  let title = 'FortyDate';
  let bodyText = '';
  let url = '/';
  let tag = 'fortydate';

  if (table === 'messages') {
    recipientId = record.destinataire;
    senderId = record.expediteur;
    const prenom = await getPrenom(senderId);
    title = prenom ? prenom + " t'a envoye un message" : 'Nouveau message';
    bodyText = truncate(record.contenu, 80) || 'Tu as recu un nouveau message';
    url = '/';
    tag = 'msg-' + senderId;
  } else if (table === 'likes') {
    // On ne notifie que les vrais j'aime (aime = true), pas les passes
    if (record.aime !== true) {
      return res.status(200).json({ skipped: 'not a like' });
    }
    recipientId = record.cible_id;
    senderId = record.auteur_id;
    const prenom = await getPrenom(senderId);
    title = prenom ? prenom + " t'a aimee \u2764\uFE0F" : "Nouveau j'aime \u2764\uFE0F";
    bodyText = "Tu as un nouveau j'aime sur FortyDate";
    url = '/';
    tag = 'like-' + senderId;
  } else {
    return res.status(200).json({ skipped: 'table not handled' });
  }

  if (!recipientId) {
    return res.status(200).json({ skipped: 'no recipient' });
  }

  // Abonnements push du destinataire (service role -> bypass RLS)
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('user_id', recipientId);

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  if (!subs || subs.length === 0) {
    return res.status(200).json({ sent: 0, reason: 'no subscription' });
  }

  const payload = JSON.stringify({
    title,
    body: bodyText,
    url,
    tag,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
  });

  let sent = 0;
  const deadIds = [];

  await Promise.all(
    subs.map(async (s) => {
      const subscription = {
        endpoint: s.endpoint,
        keys: { p256dh: s.p256dh, auth: s.auth },
      };
      try {
        await webpush.sendNotification(subscription, payload);
        sent++;
      } catch (err) {
        const code = err && err.statusCode;
        // 404 / 410 = abonnement mort -> a supprimer
        if (code === 404 || code === 410) {
          deadIds.push(s.id);
        }
      }
    })
  );

  if (deadIds.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', deadIds);
  }

  return res.status(200).json({ sent, cleaned: deadIds.length });
}
