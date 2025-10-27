export const emailTemplates = {
  passwordReset: (resetLink: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recuperação de Senha - Xjobs</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #2563eb;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
          background-color: #f9fafb;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #2563eb;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Xjobs</h1>
        </div>
        <div class="content">
          <h2>Recuperação de Senha</h2>
          <p>Olá,</p>
          <p>Recebemos uma solicitação para redefinir sua senha na plataforma Xjobs.</p>
          <p>Clique no botão abaixo para criar uma nova senha:</p>
          <p style="text-align: center;">
            <a href="${resetLink}" class="button">Redefinir Senha</a>
          </p>
          <p>Se você não solicitou a redefinição de senha, ignore este e-mail.</p>
          <p>Este link é válido por 1 hora.</p>
        </div>
        <div class="footer">
          <p>© 2024 Xjobs. Todos os direitos reservados.</p>
          <p>Este é um e-mail automático, por favor não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  welcome: (userName: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bem-vindo à Xjobs</title>
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
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 32px;
          font-weight: 700;
          letter-spacing: -0.5px;
        }
        .header .subtitle {
          margin-top: 8px;
          font-size: 16px;
          opacity: 0.9;
        }
        .content {
          padding: 40px 30px;
        }
        .welcome-message {
          font-size: 24px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 20px;
        }
        .description {
          font-size: 16px;
          color: #6b7280;
          margin-bottom: 30px;
          line-height: 1.7;
        }
        .features {
          background-color: #f8fafc;
          border-radius: 8px;
          padding: 24px;
          margin: 30px 0;
        }
        .feature-item {
          display: flex;
          align-items: center;
          margin-bottom: 16px;
          font-size: 15px;
          color: #374151;
        }
        .feature-item:last-child {
          margin-bottom: 0;
        }
        .feature-icon {
          width: 20px;
          height: 20px;
          background-color: #10b981;
          border-radius: 50%;
          margin-right: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: bold;
        }
        .button {
          display: inline-block;
          padding: 16px 32px;
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.3);
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px -1px rgba(37, 99, 235, 0.4);
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
        .social-links {
          margin-top: 20px;
        }
        .social-links a {
          display: inline-block;
          margin: 0 8px;
          color: #6b7280;
          text-decoration: none;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🎉 Bem-vindo à Xjobs!</h1>
          <div class="subtitle">Sua jornada freelancer começa agora</div>
        </div>
        <div class="content">
          <div class="welcome-message">Olá, ${userName}!</div>
          <div class="description">
            Estamos muito felizes em ter você conosco! A Xjobs é a plataforma que conecta talentos freelancers a projetos incríveis, oferecendo segurança e transparência em todas as transações.
          </div>
          
          <div class="features">
            <div class="feature-item">
              <div class="feature-icon">✓</div>
              <span>Encontre projetos que combinam com suas habilidades</span>
            </div>
            <div class="feature-item">
              <div class="feature-icon">✓</div>
              <span>Conecte-se com clientes de todo o Brasil</span>
            </div>
            <div class="feature-item">
              <div class="feature-icon">✓</div>
              <span>Receba pagamentos seguros com garantia</span>
            </div>
            <div class="feature-item">
              <div class="feature-icon">✓</div>
              <span>Construa seu portfólio profissional</span>
            </div>
          </div>

          <div style="text-align: center;">
            <a href="https://www.xjobsfreelancer.com/dashboard" class="button">
              Acessar Minha Conta
            </a>
          </div>

          <div style="margin-top: 30px; padding: 20px; background-color: #eff6ff; border-radius: 8px; border-left: 4px solid #2563eb;">
            <strong style="color: #1e40af;">💡 Dica:</strong>
            <p style="margin: 8px 0 0 0; color: #1e40af; font-size: 14px;">
              Complete seu perfil com suas melhores habilidades e projetos para aumentar suas chances de ser contratado!
            </p>
          </div>
        </div>
        <div class="footer">
          <p><strong>Xjobs</strong> - Conectando talentos a oportunidades</p>
          <p>© 2024 Xjobs. Todos os direitos reservados.</p>
          <p>Este é um e-mail automático, por favor não responda.</p>
          <div class="social-links">
            <a href="#">Suporte</a> • <a href="#">Termos de Uso</a> • <a href="#">Política de Privacidade</a>
          </div>
        </div>
      </div>
    </body>
    </html>
  `,

  proposalReceived: (clientName: string, projectName: string, freelancerName: string, proposedBudget: number) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nova Proposta Recebida - Xjobs</title>
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
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
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
          font-size: 20px;
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
        .proposal-card {
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
          border: 2px solid #10b981;
          border-radius: 12px;
          padding: 24px;
          margin: 30px 0;
        }
        .proposal-title {
          font-size: 18px;
          font-weight: 600;
          color: #065f46;
          margin-bottom: 16px;
        }
        .proposal-details {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid #d1fae5;
        }
        .detail-item:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 500;
          color: #047857;
        }
        .detail-value {
          font-weight: 600;
          color: #065f46;
        }
        .budget {
          font-size: 24px;
          font-weight: 700;
          color: #059669;
          text-align: center;
          margin: 20px 0;
          padding: 16px;
          background-color: white;
          border-radius: 8px;
          border: 2px dashed #10b981;
        }
        .button {
          display: inline-block;
          padding: 16px 32px;
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(5, 150, 105, 0.3);
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px -1px rgba(5, 150, 105, 0.4);
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
          <h1>🎯 Nova Proposta Recebida!</h1>
        </div>
        <div class="content">
          <div class="greeting">Olá, ${clientName}!</div>
          <div class="message">
            Você recebeu uma nova proposta para seu projeto! Um freelancer talentoso está interessado em trabalhar com você.
          </div>
          
          <div class="proposal-card">
            <div class="proposal-title">📋 Detalhes da Proposta</div>
            <div class="proposal-details">
              <div class="detail-item">
                <span class="detail-label">Projeto:</span>
                <span class="detail-value">${projectName}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Freelancer:</span>
                <span class="detail-value">${freelancerName}</span>
              </div>
            </div>
            
            <div class="budget">
              R$ ${(proposedBudget / 100).toFixed(2).replace('.', ',')}
            </div>
          </div>

          <div style="text-align: center;">
            <a href="https://www.xjobsfreelancer.com/cliente/projetos" class="button">
              Ver Proposta Completa
            </a>
          </div>

          <div style="margin-top: 30px; padding: 20px; background-color: #fef3c7; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <strong style="color: #92400e;">⏰ Importante:</strong>
            <p style="margin: 8px 0 0 0; color: #92400e; font-size: 14px;">
              Analise a proposta com cuidado e entre em contato com o freelancer se tiver dúvidas. A comunicação é fundamental para o sucesso do projeto!
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
  `,

  proposalAccepted: (freelancerName: string, projectName: string, proposedBudget: number) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Proposta Aceita! - Xjobs</title>
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
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          color: white;
          padding: 40px 30px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 32px;
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
        .success-card {
          background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
          border: 2px solid #8b5cf6;
          border-radius: 12px;
          padding: 24px;
          margin: 30px 0;
          text-align: center;
        }
        .success-icon {
          font-size: 48px;
          margin-bottom: 16px;
        }
        .project-details {
          background-color: white;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }
        .detail-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .detail-row:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 500;
          color: #6b7280;
        }
        .detail-value {
          font-weight: 600;
          color: #1f2937;
        }
        .budget-highlight {
          font-size: 28px;
          font-weight: 700;
          color: #7c3aed;
          margin: 20px 0;
        }
        .next-steps {
          background-color: #fef3c7;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
          border-left: 4px solid #f59e0b;
        }
        .next-steps h3 {
          color: #92400e;
          margin-top: 0;
          margin-bottom: 16px;
        }
        .next-steps ul {
          margin: 0;
          padding-left: 20px;
          color: #92400e;
        }
        .next-steps li {
          margin-bottom: 8px;
        }
        .button {
          display: inline-block;
          padding: 16px 32px;
          background: linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%);
          color: white;
          text-decoration: none;
          border-radius: 8px;
          font-weight: 600;
          font-size: 16px;
          text-align: center;
          transition: all 0.3s ease;
          box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.3);
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px -1px rgba(124, 58, 237, 0.4);
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
          <h1>🎉 Parabéns! Sua Proposta Foi Aceita!</h1>
        </div>
        <div class="content">
          <div class="greeting">Olá, ${freelancerName}!</div>
          <div class="message">
            Excelente notícia! O cliente aceitou sua proposta e está pronto para começar o projeto. Agora é hora de aguardar o depósito da garantia para iniciar os trabalhos.
          </div>
          
          <div class="success-card">
            <div class="success-icon">✅</div>
            <div class="project-details">
              <div class="detail-row">
                <span class="detail-label">Projeto:</span>
                <span class="detail-value">${projectName}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Valor da Proposta:</span>
                <span class="detail-value budget-highlight">R$ ${(proposedBudget / 100).toFixed(2).replace('.', ',')}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value" style="color: #059669;">Aguardando Garantia</span>
              </div>
            </div>
          </div>

          <div class="next-steps">
            <h3>📋 Próximos Passos:</h3>
            <ul>
              <li>O cliente fará o depósito da garantia</li>
              <li>Você receberá uma notificação quando o pagamento for confirmado</li>
              <li>Inicie a comunicação com o cliente para alinhar detalhes</li>
              <li>Comece a trabalhar no projeto</li>
            </ul>
          </div>

          <div style="text-align: center;">
            <a href="https://www.xjobsfreelancer.com/freelancer/projetos" class="button">
              Acompanhar Projeto
            </a>
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
  `,

  escrowDeposited: (freelancerName: string, projectName: string, projectValue: number, clientName: string) => `
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
  `,

  projectStatus: (projectName: string, status: string, userName: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Atualização de Projeto - Xjobs</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background-color: #2563eb;
          color: white;
          padding: 20px;
          text-align: center;
        }
        .content {
          padding: 20px;
          background-color: #f9fafb;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #2563eb;
          color: white;
          text-decoration: none;
          border-radius: 4px;
          margin: 20px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          font-size: 12px;
          color: #666;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Xjobs</h1>
        </div>
        <div class="content">
          <h2>Atualização de Projeto</h2>
          <p>Olá ${userName},</p>
          <p>O status do seu projeto "${projectName}" foi atualizado para: <strong>${status}</strong></p>
          <p style="text-align: center;">
            <a href="https://www.xjobsfreelancer.com/projects" class="button">Ver Projeto</a>
          </p>
        </div>
        <div class="footer">
          <p>© 2024 Xjobs. Todos os direitos reservados.</p>
          <p>Este é um e-mail automático, por favor não responda.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  supportMessage: (userName: string, userEmail: string, subject: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nova Mensagem de Suporte - Xjobs</title>
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
        .message-card {
          background-color: #f8fafc;
          border-radius: 8px;
          padding: 24px;
          margin: 20px 0;
          border-left: 4px solid #dc2626;
        }
        .user-info {
          background-color: #eff6ff;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #2563eb;
        }
        .info-item {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          padding: 4px 0;
        }
        .info-label {
          font-weight: 600;
          color: #374151;
        }
        .info-value {
          color: #6b7280;
        }
        .message-content {
          background-color: white;
          border: 1px solid #e5e7eb;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          font-family: monospace;
          white-space: pre-wrap;
          word-wrap: break-word;
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
          <h1>📧 Nova Mensagem de Suporte</h1>
        </div>
        <div class="content">
          <p style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 20px;">
            Você recebeu uma nova mensagem de suporte através da plataforma Xjobs.
          </p>
          
          <div class="user-info">
            <h3 style="margin-top: 0; color: #1e40af;">👤 Informações do Usuário</h3>
            <div class="info-item">
              <span class="info-label">Nome:</span>
              <span class="info-value">${userName}</span>
            </div>
            <div class="info-item">
              <span class="info-label">E-mail:</span>
              <span class="info-value">${userEmail}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Data:</span>
              <span class="info-value">${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</span>
            </div>
          </div>
          
          <div class="message-card">
            <h3 style="margin-top: 0; color: #991b1b;">📋 Assunto</h3>
            <p style="font-size: 16px; font-weight: 600; color: #374151; margin: 0;">${subject}</p>
          </div>
          
          <div class="message-card">
            <h3 style="margin-top: 0; color: #991b1b;">💬 Mensagem</h3>
            <div class="message-content">${message}</div>
          </div>
          
          <div style="background-color: #fef2f2; border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid #dc2626;">
            <h4 style="color: #991b1b; margin-top: 0; margin-bottom: 12px;">⚠️ Ação Necessária</h4>
            <p style="color: #7f1d1d; font-size: 14px; margin: 0;">
              Por favor, responda esta mensagem diretamente para o e-mail do usuário: <strong>${userEmail}</strong>
            </p>
          </div>
        </div>
        <div class="footer">
          <p><strong>Xjobs</strong> - Sistema de Suporte</p>
          <p>© 2024 Xjobs. Todos os direitos reservados.</p>
          <p>Este é um e-mail automático do sistema de suporte.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  supportConfirmation: (userName: string, subject: string, message: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Confirmação de Suporte - Xjobs</title>
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
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
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
          font-size: 20px;
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
        .support-card {
          background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
          border: 2px solid #10b981;
          border-radius: 12px;
          padding: 24px;
          margin: 30px 0;
        }
        .support-title {
          font-size: 18px;
          font-weight: 600;
          color: #065f46;
          margin-bottom: 16px;
        }
        .detail-item {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 8px 0;
          border-bottom: 1px solid #d1fae5;
        }
        .detail-item:last-child {
          border-bottom: none;
        }
        .detail-label {
          font-weight: 500;
          color: #047857;
          min-width: 80px;
        }
        .detail-value {
          font-weight: 400;
          color: #065f46;
          flex: 1;
          margin-left: 16px;
          word-wrap: break-word;
        }
        .message-content {
          background-color: white;
          border: 1px solid #d1fae5;
          border-radius: 8px;
          padding: 16px;
          margin-top: 8px;
          font-family: inherit;
          white-space: pre-wrap;
          word-wrap: break-word;
          color: #374151;
        }
        .timeline {
          background-color: #eff6ff;
          border-radius: 8px;
          padding: 24px;
          margin: 30px 0;
          border-left: 4px solid #2563eb;
        }
        .timeline h3 {
          color: #1e40af;
          margin-top: 0;
          margin-bottom: 16px;
        }
        .timeline-item {
          display: flex;
          align-items: center;
          margin-bottom: 12px;
          font-size: 14px;
          color: #374151;
        }
        .timeline-item:last-child {
          margin-bottom: 0;
        }
        .timeline-icon {
          width: 20px;
          height: 20px;
          background-color: #10b981;
          border-radius: 50%;
          margin-right: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 12px;
          font-weight: bold;
        }
        .contact-info {
          background-color: #fef3c7;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
          border-left: 4px solid #f59e0b;
        }
        .contact-info h4 {
          color: #92400e;
          margin-top: 0;
          margin-bottom: 12px;
        }
        .contact-info p {
          color: #78350f;
          font-size: 14px;
          margin: 8px 0;
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
          <h1>✅ Solicitação de Suporte Recebida!</h1>
        </div>
        <div class="content">
          <div class="greeting">Olá, ${userName}!</div>
          <div class="message">
            Recebemos sua solicitação de suporte e nossa equipe já foi notificada. Entraremos em contato com você em breve para resolver sua questão.
          </div>
          
          <div class="support-card">
            <div class="support-title">📋 Resumo da sua Solicitação</div>
            <div class="detail-item">
              <span class="detail-label">Assunto:</span>
              <span class="detail-value">${subject}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Data:</span>
              <span class="detail-value">${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Mensagem:</span>
              <div class="detail-value">
                <div class="message-content">${message}</div>
              </div>
            </div>
          </div>

          <div class="timeline">
            <h3>🕐 O que acontece agora?</h3>
            <div class="timeline-item">
              <div class="timeline-icon">✓</div>
              <span>Sua solicitação foi recebida e registrada em nosso sistema</span>
            </div>
            <div class="timeline-item">
              <div class="timeline-icon">2</div>
              <span>Nossa equipe de suporte analisará sua questão</span>
            </div>
            <div class="timeline-item">
              <div class="timeline-icon">3</div>
              <span>Entraremos em contato em até 24 horas úteis</span>
            </div>
            <div class="timeline-item">
              <div class="timeline-icon">4</div>
              <span>Trabalharemos juntos para resolver sua questão</span>
            </div>
          </div>

          <div class="contact-info">
              <h4>📞 Precisa de Ajuda Urgente?</h4>
              <p><strong>E-mail:</strong> xjbos@yahoo.com</p>
              <p><strong>CNPJ:</strong> 36.477.658/0001-36</p>
              <p><strong>Localização:</strong> São Paulo, SP</p>
              <p><strong>Horário de Atendimento:</strong> Segunda a Sexta, 9h às 18h</p>
            </div>

          <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid #10b981;">
            <strong style="color: #065f46;">💡 Dica:</strong>
            <p style="margin: 8px 0 0 0; color: #065f46; font-size: 14px;">
              Mantenha este e-mail para referência futura. Se precisar adicionar mais informações à sua solicitação, responda diretamente a este e-mail.
            </p>
          </div>
        </div>
        <div class="footer">
          <p><strong>Xjobs</strong> - Suporte ao Cliente</p>
          <p>© 2024 Xjobs. Todos os direitos reservados.</p>
          <p>Este é um e-mail automático, mas você pode responder se precisar adicionar mais informações.</p>
        </div>
      </div>
    </body>
    </html>
  `,

  supportResponse: (userName: string, originalSubject: string, responseMessage: string) => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Resposta do Suporte - Xjobs</title>
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
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
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
          font-size: 20px;
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
        .response-card {
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          border: 2px solid #2563eb;
          border-radius: 12px;
          padding: 24px;
          margin: 30px 0;
        }
        .response-title {
          font-size: 18px;
          font-weight: 600;
          color: #1e40af;
          margin-bottom: 16px;
        }
        .response-content {
          background-color: white;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 20px;
          margin-top: 16px;
          font-family: inherit;
          white-space: pre-wrap;
          word-wrap: break-word;
          color: #374151;
          line-height: 1.6;
        }
        .original-subject {
          background-color: #f3f4f6;
          border-radius: 8px;
          padding: 16px;
          margin: 20px 0;
          border-left: 4px solid #6b7280;
        }
        .original-subject h4 {
          color: #374151;
          margin-top: 0;
          margin-bottom: 8px;
          font-size: 14px;
          font-weight: 600;
        }
        .original-subject p {
          color: #6b7280;
          margin: 0;
          font-size: 14px;
        }
        .contact-info {
          background-color: #fef3c7;
          border-radius: 8px;
          padding: 20px;
          margin: 30px 0;
          border-left: 4px solid #f59e0b;
        }
        .contact-info h4 {
          color: #92400e;
          margin-top: 0;
          margin-bottom: 12px;
        }
        .contact-info p {
          color: #78350f;
          font-size: 14px;
          margin: 8px 0;
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
          <h1>💬 Resposta do Suporte Xjobs</h1>
        </div>
        <div class="content">
          <div class="greeting">Olá, ${userName}!</div>
          <div class="message">
            Nossa equipe de suporte analisou sua solicitação e preparou uma resposta para você. Esperamos que isso resolva sua questão.
          </div>

          <div class="original-subject">
            <h4>📋 Referente à sua solicitação:</h4>
            <p>${originalSubject}</p>
          </div>

          <div class="response-card">
            <div class="response-title">📝 Resposta da Equipe de Suporte</div>
            <div class="response-content">${responseMessage}</div>
          </div>

          <div class="contact-info">
            <h4>📞 Ainda Precisa de Ajuda?</h4>
            <p>Se você ainda tiver dúvidas ou precisar de mais esclarecimentos, não hesite em entrar em contato conosco:</p>
            <p><strong>E-mail:</strong> xjbos@yahoo.com</p>
            <p><strong>Telefone:</strong> (11) 99288-9284</p>
            <p><strong>Localização:</strong> São Paulo, SP</p>
            <p><strong>Horário de Atendimento:</strong> Segunda a Sexta, 9h às 18h</p>
          </div>

          <div style="background-color: #f0fdf4; border-radius: 8px; padding: 20px; margin: 30px 0; border-left: 4px solid #10b981;">
            <strong style="color: #065f46;">💡 Dica:</strong>
            <p style="margin: 8px 0 0 0; color: #065f46; font-size: 14px;">
              Você pode responder diretamente a este e-mail se precisar de mais esclarecimentos sobre esta resposta.
            </p>
          </div>
        </div>
        <div class="footer">
          <p><strong>Xjobs</strong> - Suporte ao Cliente</p>
          <p>© 2024 Xjobs. Todos os direitos reservados.</p>
          <p>Obrigado por usar a Xjobs!</p>
        </div>
      </div>
    </body>
    </html>
  `
};