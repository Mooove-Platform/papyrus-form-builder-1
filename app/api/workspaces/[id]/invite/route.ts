import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: 'Service email non configuré' },
        { status: 500 }
      );
    }

    const { email, workspaceName, inviterName } = await request.json();
    const workspaceId = params.id;

    if (!email || !workspaceName) {
      return NextResponse.json(
        { error: 'Email et nom du workspace requis' },
        { status: 400 }
      );
    }

    const workspaceUrl = `${process.env.NEXT_PUBLIC_APP_URL}/workspaces/${workspaceId}`;
    const inviter = inviterName || 'Un collaborateur';

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: 'Papyrus <noreply@mooove.live>',
      to: [email],
      subject: `Invitation à rejoindre "${workspaceName}" sur Papyrus`,
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Invitation Papyrus</title>
        </head>
        <body style="font-family: 'DM Sans', system-ui, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #F7F0DC 0%, #FFFDF5 100%); border-radius: 12px; padding: 32px; margin-bottom: 24px; border: 1px solid #D4B896;">
            <h1 style="color: #052139; margin: 0; font-size: 28px; font-weight: 600;">
              Vous êtes invité(e) à rejoindre un espace de travail
            </h1>
          </div>

          <div style="background: #FFFDF5; border-radius: 8px; padding: 24px; margin-bottom: 24px; border: 1px solid #D4B896;">
            <p style="margin: 0 0 16px 0; font-size: 16px;">
              Bonjour,
            </p>
            <p style="margin: 0 0 16px 0; font-size: 16px;">
              <strong>${inviter}</strong> vous a invité(e) à rejoindre l'espace de travail <strong>"${workspaceName}"</strong> sur Papyrus.
            </p>
            <p style="margin: 0 0 24px 0; font-size: 16px;">
              Cliquez sur le lien ci-dessous pour accéder à votre nouvel espace de collaboration :
            </p>

            <div style="text-align: center;">
              <a href="${workspaceUrl}"
                 style="background: #2AC2DE; color: #052139; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 16px; display: inline-block;">
                Accéder à l'espace de travail
              </a>
            </div>
          </div>

          <div style="border-top: 1px solid #D4B896; padding-top: 16px; color: #666; font-size: 14px;">
            <p style="margin: 0;">
              Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :
            </p>
            <p style="margin: 8px 0 0 0; word-break: break-all;">
              <a href="${workspaceUrl}" style="color: #2AC2DE;">${workspaceUrl}</a>
            </p>
            <p style="margin: 16px 0 0 0; font-size: 12px; color: #999;">
              Cet email a été envoyé depuis Papyrus, le form builder de Mooove.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `
Vous êtes invité(e) à rejoindre un espace de travail Papyrus

${inviter} vous a invité(e) à rejoindre l'espace de travail "${workspaceName}" sur Papyrus.

Pour accéder à votre nouvel espace de collaboration, suivez ce lien :
${workspaceUrl}

Cet email a été envoyé depuis Papyrus, le form builder de Mooove.
      `,
    });

    if (error) {
      console.error('Error sending email:', error);
      return NextResponse.json(
        { error: 'Erreur lors de l\'envoi de l\'email' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: data?.id });
  } catch (error) {
    console.error('Error in invite API:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500 }
    );
  }
}