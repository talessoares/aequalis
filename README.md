# Aequalis

Aplicativo desktop para gravar curvas de equalização no DSP do fone USB-C Kuba Auri. O nome exibido no aplicativo é **Aequalis**.

Este projeto foi baseado no funcionamento e nos conceitos do equalizador web oficial da Kuba:

- [equalizador.kuba.audio](https://equalizador.kuba.audio/) – referência para as curvas, filtros e comunicação HID.
- [kuba.audio](https://kuba.audio/) – site da Kuba e referência do produto.

O Aequalis é uma implementação desktop independente, criada com Electron e `node-hid`. Não é um produto oficial da Kuba nem substitui os sites acima.

## Ícone

O ícone do aplicativo foi obtido do Flaticon:

- [Letter A icon](https://www.flaticon.com/free-icon/letter-a_3665883) – Flaticon
- [Settings icon](https://www.flaticon.com/free-icon/setting_2956788) – Flaticon
- [Info icon](https://www.flaticon.com/free-icon/info_471662) – Flaticon

O arquivo `icon.png` é usado no ícone da janela e na bandeja do sistema. Consulte os termos de uso do Flaticon para verificar os requisitos de atribuição aplicáveis à forma de distribuição do aplicativo.

## Como funciona

O app web original usa a **WebHID API** (`navigator.hid`) para enviar os coeficientes de filtros biquad diretamente para o DSP do fone via USB. Este app desktop faz a mesma coisa usando **node-hid** (via Electron), que tem acesso ao dispositivo HID no sistema operacional.

Não é processamento de áudio em tempo real: o app grava a curva de EQ na memória do fone, e o fone aplica a equalização por conta própria.

## Desenvolvimento

### Requisitos

- Node.js instalado
- Windows, macOS ou Linux
- Google Chrome ou Edge (para o app web original) – não necessário para este desktop
- Fone Kuba Auri conectado via USB-C

### Preparar o ambiente

Abra o terminal na pasta do projeto:

```powershell
cd "$env:USERPROFILE\OneDrive\Documentos\aequalis-desktop-eq"
npm install
```

Se o `npm install` falhar por timeout de rede, tente novamente ou verifique sua conexão.

### Executar em modo de desenvolvimento

```powershell
cd "$env:USERPROFILE\OneDrive\Documentos\aequalis-desktop-eq"
npm start
```

Ou diretamente:

```powershell
npx electron .
```

### Versionamento semântico

As versões seguem o padrão [Semantic Versioning](https://semver.org/lang/pt-BR/):
`MAJOR.MINOR.PATCH`.

- `PATCH` (`1.0.1`): correções compatíveis.
- `MINOR` (`1.1.0`): novas funcionalidades compatíveis.
- `MAJOR` (`2.0.0`): mudanças incompatíveis.

O campo `version` do `package.json` é a fonte da versão do aplicativo. Para
atualizar a versão e criar o commit correspondente:

```powershell
npm run release:patch
# ou: npm run release:minor
# ou: npm run release:major
git push --follow-tags
```

### Build do instalador

Para gerar o instalador do Windows localmente:

```powershell
npm install
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"
npm run build
```

Os arquivos gerados ficam na pasta `dist`. O instalador normalmente terá um nome
semelhante a `Kuba Equalizador Setup 1.0.0.exe`.

O instalador não é assinado digitalmente. Por isso, o Windows pode exibir um
aviso do SmartScreen durante a instalação. Esse aviso é esperado para builds
distribuídos sem um certificado de assinatura.

### Erro de links simbólicos no Windows

Se o build falhar com `Cannot create symbolic link` ou `O cliente não tem o
privilégio necessário`, o Windows não permitiu que o Electron Builder extraísse
o componente de assinatura. Tente uma destas opções:

1. Ative o **Modo de desenvolvedor** em **Configurações > Sistema > Para
   desenvolvedores** e execute o build novamente.
2. Abra o PowerShell como administrador e execute:

   ```powershell
   $env:CSC_IDENTITY_AUTO_DISCOVERY="false"
   npm run build
   ```

Se o erro persistir, limpe somente o cache do componente e tente novamente:

```powershell
Remove-Item -Recurse -Force "$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign"
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"
npm run build
```

### Publicar uma release no GitHub

Depois de gerar o instalador, crie uma tag e publique a release usando o GitHub
CLI. É necessário estar autenticado com `gh auth login` e ter o repositório
remoto configurado:

```powershell
gh auth login
gh release create v1.0.0 `
  --title "Aequalis v1.0.0" `
  --generate-notes `
  .\dist\*.exe
```

Para novas versões, use o comando correspondente ao tipo da alteração. O npm
atualiza o `package.json`, cria o commit e cria a tag automaticamente:

```powershell
npm run release:minor
git push --follow-tags
$env:CSC_IDENTITY_AUTO_DISCOVERY="false"
npm run build
gh release create v1.1.0 --title "Aequalis v1.1.0" --generate-notes .\dist\*.exe
```

## Instalação

Para instalar o Aequalis, abra a página **Releases** do repositório no GitHub e
baixe o instalador `.exe` da versão desejada. Execute o arquivo baixado e siga
as instruções do instalador.

Os instaladores distribuídos atualmente não são assinados digitalmente. Por
isso, o Windows pode exibir um aviso do SmartScreen. Nesse caso, confirme que o
arquivo foi baixado da página oficial de releases antes de prosseguir.

## Funcionalidades

1. **Conectar**: Detecta e abre o dispositivo HID do fone (Vendor ID: 0x3302, Product ID: 0x8902).
2. **Escolher o fone**: O Auri é o modelo disponível no aplicativo.
3. **Escolher preset**: Curvas Auri, Natural, Em V, Basshead, Enérgico, Musical e Analítico.
4. **Usar curvas de referência**: JM-1, Harman IE 2019, VDSF e Etymotic são apresentadas como referências de comparação.
5. **Criar curva personalizada**: Configure o nome, pré-amplificador e 10 filtros Peak ou Low shelf.
6. **Importar e exportar curvas**: Curvas personalizadas podem ser salvas e compartilhadas em arquivos JSON compatíveis com o próprio Aequalis.
7. **Visualizar curva**: O gráfico mostra a resposta estimada, com escala em dB, grade, linha de 0 dB e faixa de 20 Hz a 20 kHz.
8. **Gravar no fone**: Envia os coeficientes dos filtros biquad via HID para gravar no DSP do fone.
9. **Histórico de gravações**: O app mantém localmente até oito curvas enviadas com sucesso, com data, modelo e opção de reaplicar.
10. **Progresso da gravação**: A interface mostra o envio dos pacotes, a validação e a conclusão da comunicação HID.
11. **Feedback sonoro configurável**: Sons sutis de clique e sucesso podem ser ativados separadamente, com volume ajustável em Configurações.
12. **Versão e atualizações**: O modal Sobre exibe a versão instalada e oferece acesso às releases do projeto.
13. **Bandeja do sistema**: Nas configurações, ative a opção para ocultar o app ao fechar. Quando desativada, o ícone é removido da bandeja e fechar a janela encerra o Aequalis. Quando ativada, o menu do ícone na bandeja permite reabrir o Aequalis, trocar a curva selecionada e sair do app.
14. **Comparação de curvas**: Clique em várias curvas de preferência ou de referência para exibi-las simultaneamente no gráfico, cada uma com uma cor diferente. O envio ao DSP fica disponível somente quando exatamente uma curva está selecionada.
15. **Modo escuro**: Pode ser ativado nas configurações. O modo escuro mantém a paleta do Aequalis e altera apenas os fundos, superfícies e contrastes para facilitar o uso em ambientes com pouca luz.
16. **Efeitos de interação**: Cartões de curvas e botões importantes exibem um efeito visual sutil ao serem clicados, acompanhado de feedback sonoro opcional.
17. **Janela maximizada**: O Aequalis abre maximizado para aproveitar melhor o espaço disponível na tela.

## Curvas personalizadas

Clique em **Criar curva** para configurar:

- Nome da curva.
- Pré-amplificador entre -24 e +12 dB.
- Dez bandas obrigatórias.
- Tipo de filtro: `Peak` ou `Low shelf`.
- Frequência entre 20 e 20.000 Hz.
- Ganho entre -24 e +12 dB.
- Q entre 0,1 e 10.

Use **Exportar** com uma curva personalizada selecionada para criar um arquivo JSON. Use **Importar** para abrir um arquivo exportado pelo Aequalis. O formato inclui uma identificação (`kuba-equalizador-curve`) e versão para impedir a importação de arquivos incompatíveis.

## Arquivos do projeto

- `main.js` – Processo principal do Electron, gerencia a conexão HID e IPC
- `preload.js` – Ponte segura entre renderer e processo principal
- `renderer.html` – Interface do usuário
- `style.css` – Estilos visuais
- `renderer.js` – Lógica DSP (filtros biquad, presets, gráficos) e UI

## Limitações e observações

- O app confirma o envio da curva, mas o protocolo atualmente utilizado não permite ler a curva já gravada de volta do DSP
- A indicação de curva aplicada é baseada no último envio bem-sucedido registrado localmente; ela não é uma leitura do conteúdo do fone
- É necessário manter o fone conectado por USB-C durante a conexão e a gravação
- Se o fone não for reconhecido, verifique se não há outro programa usando o dispositivo HID

## Tecnologias

- Electron (wrapper desktop)
- node-hid (acesso ao dispositivo USB HID)
- Canvas API (visualização da curva de EQ)
- WebHID API concepts (replicados para desktop)

## Licença

Este projeto é distribuído como software livre e open source sob a licença **MIT**. Isso permite usar, copiar, modificar e redistribuir o código, inclusive em projetos comerciais, desde que o aviso de copyright e o texto da licença sejam mantidos.

O código deste aplicativo é uma implementação independente. As marcas **Kuba**, **Auri**, **Disco 3**, os sites e demais conteúdos da Kuba pertencem aos seus respectivos proprietários. As curvas e referências de áudio podem ter origens e condições de uso próprias; consulte as fontes correspondentes antes de redistribuí-las.

Consulte o arquivo [`LICENSE`](LICENSE) para o texto completo da licença.