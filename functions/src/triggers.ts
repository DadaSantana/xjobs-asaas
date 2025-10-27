// Temporariamente comentado para resolver problemas de build
/*
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Trigger para enviar e-mail quando o status do projeto muda para 'executando'
export const onProjectStatusChanged = functions.firestore
  .document('projects/{projectId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    const projectId = context.params.projectId;

    // Verificar se o status mudou para 'executando'
    if (before.status !== 'executando' && after.status === 'executando') {
      try {
        console.log(`Status do projeto ${projectId} mudou para executando`);

        // Buscar dados do projeto
        const project = after;
        
        // Buscar dados do freelancer
        const freelancerDoc = await admin.firestore()
          .collection('users')
          .doc(project.selectedFreelancerId)
          .get();

        if (!freelancerDoc.exists) {
          console.error('Freelancer não encontrado');
          return;
        }

        const freelancer = freelancerDoc.data();

        // Buscar dados do cliente
        const clientDoc = await admin.firestore()
          .collection('users')
          .doc(project.clientId)
          .get();

        if (!clientDoc.exists) {
          console.error('Cliente não encontrado');
          return;
        }

        const client = clientDoc.data();

        // Buscar dados do pagamento para obter o valor
        const paymentQuery = await admin.firestore()
          .collection('projectPayments')
          .where('projectId', '==', projectId)
          .limit(1)
          .get();

        let projectValue = 0;
        if (!paymentQuery.empty) {
          const paymentData = paymentQuery.docs[0].data();
          projectValue = paymentData.projectValue * 100; // Converter para centavos
        }

        // Enviar e-mail de garantia depositada
        await admin.firestore().collection('mail').add({
          to: freelancer.email,
          message: {
            subject: `Garantia Confirmada - Inicie o Projeto ${project.title}!`,
            html: generateEscrowDepositedEmail(
              freelancer.name,
              project.title,
              projectValue,
              client.name
            )
          },
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        console.log(`E-mail de garantia depositada enviado para ${freelancer.email}`);
      } catch (error) {
        console.error('Erro ao processar mudança de status do projeto:', error);
      }
    }
  });
*/

// Função para gerar o HTML do e-mail de garantia depositada
// Temporariamente comentada para resolver problemas de build
/*
function generateEscrowDepositedEmail(
  freelancerName: string,
  projectName: string,
  projectValue: number,
  clientName: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Garantia Depositada - Inicie o Projeto! - Xjobs</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #1f2937;
          margin: 0;
          padding: 0;
          background-color: #f8fafc;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 28px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .content {
          padding: 40px 30px;
        }
        .greeting {
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 20px;
        }
        .message {
          font-size: 16px;
          color: #6b7280;
          margin-bottom: 30px;
          line-height: 1.7;
        }
        .success-banner {
          background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
          border: 2px solid #16a34a;
          border-radius: 12px;
          padding: 30px;
          margin: 30px 0;
          text-align: center;
        }
        .success-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .project-info {
          background-color: white;
          border-radius: 8px;
          padding: 24px;
          margin: 20px 0;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 20px;
        }
        .info-item {
          padding: 12px;
          background-color: #f8fafc;
          border-radius: 6px;
        }
        .info-label {
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .info-value {
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          margin-top: 4px;
        }
        .budget-display {
          background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
          border: 2px solid #f59e0b;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 20px 0;
        }
        .budget-amount {
          font-size: 32px;
          font-weight: 700;
          color: #92400e;
          margin: 10px 0;
        }
        .action-steps {
          background-color: #eff6ff;
          border-radius: 8px;
          padding: 24px;
          margin: 30px 0;
          border-left: 4px solid #2563eb;
        }
        .action-steps h3 {
          color: #1e40af;
          margin-top: 0;
          margin-bottom: 16px;
        }
        .step-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .step-list li {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          padding: 8px 0;
        }
        .step-number {
          width: 24px;
          height: 24px;
          background-color: #2563eb;
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          margin-right: 12px;
        }
        .step-text {
          color: #1e40af;
          font-weight: 500;
        }
        .button {
          display: inline-block;
          padding: 16px 32px;
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(220, 38, 38, 0.3);
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px -1px rgba(220, 38, 38, 0.4);
        }
        .security-note {
          background-color: #fef2f2;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
          border-left: 4px solid #dc2626;
        }
        .security-note h4 {
          color: #991b1b;
          margin-top: 0;
          margin-bottom: 12px;
        }
        .security-note p {
          color: #7f1d1d;
          font-size: 14px;
          margin: 0;
        }
        .footer {
          text-align: center;
          padding: 30px;
          background-color: #f8fafc;
          border-top: 1px solid #e5e7eb;
        }
        .footer p {
          margin: 5px 0;
          font-size: 14px;
          color: #6b7280;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚀 Garantia Confirmada - Hora de Trabalhar!</h1>
        </div>
        <div class="content">
          <div class="greeting">Olá, ${freelancerName}!</div>
          <div class="message">
            Excelente! O cliente depositou a garantia e você pode começar a trabalhar no projeto imediatamente. O pagamento está seguro e será liberado após a conclusão e aprovação do trabalho.
          </div>
          
          <div class="success-banner">
            <div class="success-icon">💰</div>
            <h2 style="color: #065f46; margin: 0 0 16px 0;">Garantia Depositada com Sucesso!</h2>
            <p style="color: #047857; margin: 0; font-weight: 500;">
              O valor está protegido e será liberado automaticamente após a conclusão do projeto.
            </p>
          </div>

          <div class="project-info">
            <div class="info-grid">
              <div class="info-item">
                <div class="info-label">Projeto</div>
                <div class="info-value">${projectName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Cliente</div>
                <div class="info-value">${clientName}</div>
              </div>
              <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value" style="color: #059669;">Em Execução</div>
              </div>
              <div class="info-item">
                <div class="info-label">Data de Início</div>
                <div class="info-value">${new Date().toLocaleDateString('pt-BR')}</div>
              </div>
            </div>
            
            <div class="budget-display">
              <div style="font-size: 14px; color: #92400e; font-weight: 500;">Valor do Projeto</div>
              <div class="budget-amount">R$ ${(projectValue / 100).toFixed(2).replace('.', ',')}</div>
              <div style="font-size: 12px; color: #92400e;">(Valor em garantia)</div>
            </div>
          </div>

          <div class="action-steps">
            <h3>🎯 Próximas Ações Recomendadas:</h3>
            <ul class="step-list">
              <li>
                <div class="step-number">1</div>
                <div class="step-text">Entre em contato com o cliente para alinhar detalhes</div>
              </li>
              <li>
                <div class="step-number">2</div>
                <div class="step-text">Defina cronograma e entregáveis</div>
              </li>
              <li>
                <div class="step-number">3</div>
                <div class="step-text">Inicie o desenvolvimento do projeto</div>
              </li>
              <li>
                <div class="step-number">4</div>
                <div class="step-text">Mantenha comunicação regular com o cliente</div>
              </li>
            </ul>
          </div>

          <div style="text-align: center;">
            <a href="https://www.xjobsfreelancer.com/freelancer/projetos" class="button">
              Acessar Projeto
            </a>
          </div>

          <div class="security-note">
            <h4>🔒 Segurança Garantida</h4>
            <p>
              O valor está protegido em nossa plataforma. Após a conclusão e aprovação do projeto pelo cliente, 
              o pagamento será liberado automaticamente para sua conta. Em caso de disputas, nossa equipe está 
              disponível para mediar e garantir uma solução justa para ambas as partes.
            </p>
          </div>
        </div>
        <div class="footer">
          <p><strong>Xjobs</strong> - Conectando talentos a oportunidades</p>
          <p>© 2024 Xjobs. Todos os direitos reservados.</p>
          <p>Este é um e-mail automático, por favor não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
*/ 