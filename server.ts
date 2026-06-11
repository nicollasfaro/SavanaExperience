import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import webpush from "web-push";
import { GoogleGenAI } from "@google/genai";
import nodemailer from "nodemailer";

// Web Push API Subscriptions storage
interface PushSubscriptionStore {
  userId: string;
  subscription: webpush.PushSubscription;
}
let pushSubscriptions: PushSubscriptionStore[] = [];

let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY || '',
  privateKey: process.env.VAPID_PRIVATE_KEY || ''
};

// If no VAPID keys exist, dynamically generate them for standard local development
if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  const generated = webpush.generateVAPIDKeys();
  vapidKeys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey
  };
  console.log("Web Push: Dynamically generated standard VAPID keys");
}

webpush.setVapidDetails(
  'mailto:ciuldinciuldin@gmail.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Let stripe validation happen later when env is provided, or initialize it lazily
  let stripeClient: Stripe | null = null;
  function getStripe(): Stripe {
    if (!stripeClient) {
      const key = process.env.STRIPE_SECRET_KEY;
      if (!key) {
        throw new Error('STRIPE_SECRET_KEY environment variable is required');
      }
      stripeClient = new Stripe(key, { apiVersion: '2023-10-16' as any });
    }
    return stripeClient;
  }

  // Gemini Client lazy initialization
  let geminiClient: GoogleGenAI | null = null;
  function getGeminiClient(): GoogleGenAI | null {
    if (!geminiClient) {
      const key = process.env.GEMINI_API_KEY;
      if (!key) {
        console.warn("GEMINI_API_KEY environment variable is missing. Support Bot will fall back to simulation.");
        return null;
      }
      geminiClient = new GoogleGenAI({
        apiKey: key,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
    }
    return geminiClient;
  }

  // --- GEMINI CHAT SUPPORT BOT ENDPOINT ---
  app.post('/api/support/reply', express.json(), async (req, res) => {
    try {
      const { message, history, courses, modules } = req.body;
      if (!message) {
        return res.status(400).json({ error: 'Missing message parameter' });
      }

      const client = getGeminiClient();
      if (!client) {
        return res.json({
          reply: `Olá! Eu sou o Dr. Gabriel (IA Simulado): O sistema do tutor de IA está temporariamente carregando ou o servidor não possui a chave GEMINI_API_KEY.
          
No momento, detectei sua mensagem e posso lhe adiantar que temos cursos incríveis de silvestres na plataforma! Como o ${courses?.[0]?.title || 'Curso de Anestesiologia de Selvagens'}. Você tem alguma dúvida sobre as aulas?`
        });
      }

      // Format courses context dynamically
      let coursesContext = "Nenhum curso cadastrado de momento.";
      if (courses && Array.isArray(courses) && courses.length > 0) {
        coursesContext = courses.map((c: any) => {
          const courseModules = (modules || []).filter((m: any) => m.courseId === c.id);
          const modulesDesc = courseModules.map((m: any) => {
            const lessonsDesc = (m.lessons || []).map((l: any) => `- ${l.title} (${l.duration || 'N/A'})`).join('\n');
            return `Módulo: ${m.title} - Descrição: ${m.description}\nAulas:\n${lessonsDesc}`;
          }).join('\n\n');

          return `
=== CURSO: ${c.title} ===
ID: ${c.id}
Categoria: ${c.category}
Instrutor: ${c.instructorName}
Preço: R$ ${c.price}
Carga Horária / Duração: ${c.totalDuration}
Tipo/Formato: ${c.format}
Descrição: ${c.description}
Módulos e Grade Curricular:
${modulesDesc}
========================
`;
        }).join('\n\n');
      }

      const systemInstruction = `
Você é o **Dr. Gabriel (IA)**, o Tutor e Suporte Inteligente e Oficial da **Savana Experience** (Plataforma Premium de Cursos Online e Formação de Residentes Veterinários em Medicina de Animais Silvestres e Exóticos).

Seu papel é:
1. Tirar todas as dúvidas dos alunos sobre quaisquer assuntos de medicina veterinária de animais silvestres, exóticos e selvagens (clínica, cirurgia, anestesiologia, manejo, patologia, legislações, etc.).
2. Atuar como um guia especialista de todos os cursos, módulos e aulas disponíveis na plataforma Savana Experience. Você deve saber tudo sobre cada curso (antigo ou novo).
3. Utilizar o contexto de cursos disponíveis abaixo para divulgar ativamente a nossa grade acadêmica, recomendar cursos específicos de acordo com a dúvida do aluno, e detalhar se temos aulas práticas, módulos ao vivo, links do Meet, etc.

Aqui está o catálogo atualizado e dinâmico de todos os cursos e módulos da plataforma para você consultar:
${coursesContext}

Regras Importantes de Conduta:
- Sempre responda de forma muito profissional, empática, acolhedora e focado num ambiente de aprendizado clínico veterinário de alto nível.
- Escreva suas respostas em português (do Brasil). Use negrito para dar ênfase a tópicos estruturados, nomes de cursos e aulas.
- Suas falas devem caber bem em bolhas de chat de atendimento. Evite enrolação desnecessária, seja direto e resolutivo, mas muito prestativo.
- Incentive o aluno a progredir nas aulas e realizar os quizzes médicos para ganhar bônus de XP na plataforma e conquistas/badges de veterinária!
`;

      const contents = [];
      
      // Map history to parts if present
      if (history && Array.isArray(history)) {
        for (const turn of history) {
          if (turn.role === 'user') {
            contents.push({ role: 'user', parts: [{ text: turn.text }] });
          } else if (turn.role === 'model') {
            contents.push({ role: 'model', parts: [{ text: turn.text }] });
          }
        }
      }

      // Add the final user message
      contents.push({ role: 'user', parts: [{ text: message }] });

      const response = await client.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text || "Desculpe, tive um contratempo em processar seu diagnóstico nesse momento. Vamos tentar de novo?";
      res.json({ reply: replyText });
    } catch (err: any) {
      console.error("Error generating answer in Gemini Support:", err);
      res.status(500).json({ error: err.message || 'Error processing request' });
    }
  });

  // --- EMAIL SENDER COMPROMISE (SMTP OR RESEND) ---
  async function sendEmail(to: string, subject: string, body: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const resendKey = process.env.RESEND_API_KEY;
    const emailFrom = process.env.SMTP_FROM || process.env.EMAIL_FROM || "Savana Experience <contato@savanaexperience.com.br>";

    // Option 1: Resend HTTP API
    if (resendKey) {
      try {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: emailFrom,
            to: [to],
            subject: subject,
            text: body,
            html: body.replace(/\n/g, '<br>')
          }),
        });

        if (!response.ok) {
          const errJson = await response.json().catch(() => ({}));
          throw new Error(errJson.message || `Resend API returned status ${response.status}`);
        }

        const resJson = await response.json();
        return { success: true, messageId: resJson.id };
      } catch (err: any) {
        console.error("[Email Service] Erro ao enviar por Resend:", err);
        return { success: false, error: `Resend: ${err.message}` };
      }
    }

    // Option 2: SMTP with nodemailer
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 465;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const isSecure = smtpPort === 465 || process.env.SMTP_SECURE === 'true';
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: isSecure,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
          tls: {
            rejectUnauthorized: false
          }
        });

        const info = await transporter.sendMail({
          from: emailFrom,
          to: to,
          subject: subject,
          text: body,
          html: body.replace(/\n/g, '<br>')
        });

        return { success: true, messageId: info.messageId };
      } catch (err: any) {
        console.error("[Email Service] Erro ao enviar por SMTP:", err);
        return { success: false, error: `SMTP: ${err.message}` };
      }
    }

    // If neither is configured
    return { 
      success: false, 
      error: "O servidor de e-mail não está configurado. Por favor, acesse o painel 'Configurações (Secrets)' do seu AI Studio e configure as credenciais SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM) ou sua chave da API RESEND_API_KEY para habilitar envios de e-mails reais."
    };
  }

  // --- WHATSAPP PRE-REGISTER EMAIL DISPATCHER ---
  app.post('/api/pre-register/send-emails', express.json(), async (req, res) => {
    try {
      const { pendingUsers, customTemplate } = req.body;
      if (!pendingUsers || !Array.isArray(pendingUsers)) {
        return res.status(400).json({ error: 'Faltando lista de usuários pendentes' });
      }
      if (!customTemplate) {
        return res.status(400).json({ error: 'O modelo de texto não pode ser vazio' });
      }

      console.log(`[Email Service] Iniciando disparo em lote para ${pendingUsers.length} usuários pendentes...`);

      const origin = req.get('origin') || 'https://savanaexperience.com.br';
      const results = [];
      let lastError: string | null = null;

      for (const user of pendingUsers) {
        const email = user.email || '';
        const courseNamesList = user.courseTitles || ['Nenhum específico'];
        const formattedCourses = courseNamesList.map((ct: string) => `• ${ct}`).join('\n');

        // Compile custom template fields
        let compiledBody = customTemplate
          .replace(/\{\{email\}\}/g, email)
          .replace(/\{\{cursos\}\}/g, formattedCourses)
          .replace(/\{\{link\}\}/g, `${origin}`);

        console.log(`[Email Service] Disparando e-mail real para: ${email}`);
        
        const subject = 'Seu acesso aos cursos na Savana Experience está pré-liberado!';
        const mailRes = await sendEmail(email, subject, compiledBody);

        if (mailRes.success) {
          results.push({
            email,
            dispatchedAt: new Date().toISOString(),
            status: 'success',
            subject,
            body: compiledBody,
            messageId: mailRes.messageId
          });
        } else {
          lastError = mailRes.error || 'Falha ao transmitir e-mail';
          results.push({
            email,
            dispatchedAt: new Date().toISOString(),
            status: 'failed',
            subject,
            body: compiledBody,
            error: mailRes.error
          });
        }
      }

      // Check if all failed due to missing configuration
      const allFailed = results.length > 0 && results.every(r => r.status === 'failed');
      if (allFailed) {
        return res.status(500).json({ 
          error: lastError || 'Falha ao enviar e-mails', 
          results 
        });
      }

      res.json({
        success: true,
        sentCount: results.filter(r => r.status === 'success').length,
        dispatched: results
      });
    } catch (err: any) {
      console.error("Erro no serviço de e-mails para pré-registro:", err);
      res.status(500).json({ error: err.message || 'Falha ao processar e-mails' });
    }
  });

  // --- WEB PUSH ENDPOINTS ---
  app.get('/api/push/public-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
  });

  app.post('/api/push/subscribe', express.json(), (req, res) => {
    try {
      const { userId, subscription } = req.body;
      if (!userId || !subscription) {
        return res.status(400).json({ error: 'Missing userId or subscription object' });
      }

      // Filter duplicate endpoints for this user or standard stale endpoints
      pushSubscriptions = pushSubscriptions.filter(item => item.subscription.endpoint !== subscription.endpoint);

      pushSubscriptions.push({ userId, subscription });
      res.status(201).json({ success: true, count: pushSubscriptions.length });
    } catch (err: any) {
      console.error("Error subscribing to push notifications:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/push/notify-live', express.json(), async (req, res) => {
    try {
      const { courseId, courseTitle, moduleTitle, roomId, studentIds } = req.body;
      if (!courseId || !courseTitle || !moduleTitle) {
        return res.status(400).json({ error: 'Missing course or module metadata' });
      }

      const targets = studentIds && Array.isArray(studentIds) ? studentIds : [];
      let matchedSubs = pushSubscriptions;
      
      if (targets.length > 0) {
        matchedSubs = pushSubscriptions.filter(sub => targets.includes(sub.userId));
      }

      const payload = JSON.stringify({
        title: '🔴 AULA AO VIVO INICIADA!',
        body: `A aula virtual "${moduleTitle}" de seu curso "${courseTitle}" começou agora. Clique para participar!`,
        url: `/?course=${courseId}&room=${roomId || ''}`
      });

      const promises = matchedSubs.map(async (subStore) => {
        try {
          await webpush.sendNotification(subStore.subscription, payload);
        } catch (err: any) {
          // If the service worker is expired or subscription is invalid, drop it
          if (err.statusCode === 410 || err.statusCode === 404) {
            pushSubscriptions = pushSubscriptions.filter(item => item.subscription.endpoint !== subStore.subscription.endpoint);
          } else {
            console.warn(`Could not dispatch background push notification to user ${subStore.userId}:`, err.message);
          }
        }
      });

      await Promise.all(promises);
      res.json({ success: true, sentCount: matchedSubs.length });
    } catch (err: any) {
      console.error("Error triggering push notifier:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/create-checkout-session', express.json(), async (req, res) => {
    try {
      const stripe = getStripe();
      const { courseId, courseTitle, coursePrice } = req.body;

      if (!courseId || !courseTitle || typeof coursePrice !== 'number') {
        return res.status(400).json({ error: 'Missing req parameters' });
      }

      // Convert price from BRL decimal to cents (e.g. 50.50 -> 5050)
      const unitAmount = Math.round(coursePrice * 100);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: courseTitle,
                metadata: {
                  courseId: courseId
                }
              },
              unit_amount: unitAmount,
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        // In preview environments the origin URL might change, try to use req headers or a known root:
        success_url: `${req.headers.origin}?session_id={CHECKOUT_SESSION_ID}&course_id=${courseId}&success=true`,
        cancel_url: `${req.headers.origin}?canceled=true`,
        metadata: {
          courseId: courseId
        }
      });

      res.json({ id: session.id, url: session.url });
    } catch (err: any) {
      console.error(err);
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);
