# Practice

Web app de estudo de piano: um plano de exercícios com temporizador, quatro ferramentas (Ear Training, Chord Dice, Progressions e Fake Book) e um histórico da prática. Funciona no browser, no computador e no telemóvel, sem instalar nada.

## Interface

- **Plan:** a lista de exercícios do dia, com resumo e barra de progresso. Em **Edit** escolhe-se a ferramenta de cada exercício, ajustam-se os minutos e juntam-se pausas (**+ Add break**). Os exercícios feitos ficam marcados até ao fim do dia; ao abrir a app, ela começa no primeiro exercício ainda por fazer.
- **Tools:** as quatro ferramentas, que se abrem a qualquer momento; a do exercício atual tem uma luz verde.
- **History:** dias e minutos por exercício, sequência de dias (aguenta até 2 dias seguidos de descanso), tempo total, e exportação/importação do histórico.
- **Temporizador:** sempre visível numa barra no topo, com play/pausa e ✓ para dar o exercício por feito. Clicando no tempo, escreve-se lá mesmo um **temporizador livre** (Free timer) para uma coisa fora do plano: "15" são 15 minutos, "15:30" quinze minutos e meio; Enter (ou clicar fora) começa, Esc cancela; o exercício do plano fica onde estava, com o seu tempo, e o temporizador livre não marca nada como feito.

## Ferramentas

- **Ear Training:** uma nota de partida e um intervalo, com teclado de três oitavas (dó3 a dó6) e a resposta só quando se pede.
- **Chord Dice:** sorteia acordes; o botão **Reveal answer** só aparece quando há um acorde por revelar.
- **Progressions (Key Generator):** sorteia tonalidades para praticar progressões.
- **Fake Book:** biblioteca de grelhas de acordes com uma banda de acompanhamento (piano, baixo e bateria).

## Fake Book

- **Importar (Import):** cola-se um link de uma música ou de uma playlist, ou um endereço web (`https://…`) de uma página ou ficheiro com músicas; escolhe-se um ficheiro `.html` exportado; ou um **PDF** de uma partitura (lead sheet) com **Choose PDF…**.
- **Importar de PDF:** a app encontra as pautas e as barras de compasso, lê as cifras por cima (pelo texto do PDF quando o tem, por OCR quando é uma digitalização) e traduz a escrita das cifras manuscritas (AMI7 → Am7, CMA7 → Cmaj7, BMI7(b5) → Bm7b5). Antes de importar mostra os compassos para rever: os que teve de adivinhar ficam a amarelo, os vazios a tracejado (um compasso vazio continua o acorde anterior). Secções, repetições e coda acrescentam-se depois no editor de compassos.
- **A forma da música:** ao tocar a grelha inteira, a banda segue as repetições (incluindo "3x"), as casas 1 e 2, D.C. e D.S., "al Fine" e "al Coda". Um loop marcado com o rato toca em linha.
- **Símbolos:** compassos sem acorde (N.C.: o piano e o baixo param, a bateria continua), barras de pausa ("C7 / / G7" = três tempos de C7 e um de G7), acordes alternativos entre parênteses (mostrados, não tocados) e mudanças de compasso a meio da música. A grelha mostra os sinais de repetição, segno, coda, casas, saltos e mudanças de compasso; o editor de compassos tem uma secção **Form** para os definir à mão.
- **Editores e transposição:** o editor de compassos mostra os acordes como a grelha os mostra (transpostos) e guarda-os no tom da música; o editor da música abre uma música transposta no tom que se vê, e ao guardar esse passa a ser o tom.
- **Barra do Fake Book:** quando o Play e o Stop de cima da grelha saem de vista, aparece por baixo do temporizador uma barra com a música, o compasso, o tempo, ▶/❚❚ e ■. A grelha desliza sozinha para o compasso que está a tocar.
- **Apagar músicas:** botão vermelho, com confirmação.

## A banda

- **19 estilos:** Jazz Swing, Swing Two-Feel, Jazz Waltz, Ballad, Bossa Nova, Samba, Partido Alto, Latin Jazz, Afro 12/8, Boogaloo, Second Line, Blues Shuffle, Slow Blues, Jazz Even 8ths, Even 16ths, Pop, Rock, Funk e Reggae.
- **Piano:** voicings de duas mãos, figuras variadas por estilo, pedal nas baladas, ruído do abafador ao largar as teclas; a andamentos lentos repete os acordes longos com variação (voz de cima, arpejo, notas do meio) e a andamentos rápidos (acima de ~190 bpm) acompanha com menos acordes.
- **Baixo:** walking bass nas escalas de cada acorde; nas notas longas a andamentos lentos passa à quinta ou à oitava.
- **Bateria:** nos estilos de jazz e latinos, uma bateria de jazz (Virtuosity Drums) com várias gravações de cada prato, pratos ligeiramente suavizados e bombo, tarola e timbalões com menos ressonância e sala; nos estilos pop, rock, funk, reggae e even 16ths, a Big Rusty; escovas na ballad e no samba. Percussão latina (congas, bongós, cowbell, claves, guiro, shaker, agogô) no Latin Jazz, Boogaloo, Bossa, Samba, Partido Alto e Afro 12/8.
- **Som:** reverb de sala, instrumentos colocados no estéreo, pequenas variações de afinação e volume em cada nota e pancada, compressão suave de toda a banda, e volumes acertados entre estilos (dentro de 1 LU).
- **Mixer:** volume de cada instrumento e da banda inteira.

## Teclado MIDI

Num browser com MIDI na página (Chrome, Edge ou Firefox; no Safari do Mac, com a extensão "Web MIDI for Safari"), basta ligar o teclado: a app deteta-o, mostra um aviso curto e toca o piano com a força de cada tecla e o pedal de sustain, nas 88 teclas (lá0 a dó8). O teclado tem um motor de áudio próprio, por isso pôr o Fake Book em pausa não o atrasa nem acorda a banda. Ao ligar o teclado, o piano da banda passa a 0 (pode voltar a subir-se no mixer); ao desligar, volta ao que estava. No iPhone e no iPad os browsers não têm MIDI. O som começa depois do primeiro clique ou tecla na página (regra dos browsers).

## Ficheiros

- `index.html` — a página e o plano, temporizador, Ear Training, Chord Dice e Progressions.
- `fake-book.js`, `fake-book.css` — o Fake Book, a banda e o leitor.
- `import-songs.js` — o importador de músicas (links, playlists, ficheiros exportados).
- `pdf-import.js` — a importação de PDFs; usa as bibliotecas em `vendor/` (PDF.js da Mozilla e Tesseract.js, ambos Apache 2.0, cerca de 12 MB, descarregadas só quando se escolhe um PDF).
- `interface.js`, `interface.css`, `theme.css` — a interface (Plan / Tools / History) e o tema. Sem estes três ficheiros, a app abre com o aspeto antigo.
- `samples/` — os sons, o `manifest.json` que os descreve, e os créditos e licenças.

## Créditos dos sons

Ver `samples/CREDITS.txt` e os ficheiros `LICENSE-*` em `samples/`:

- Piano acústico: Salamander Grand Piano (CC BY 3.0, crédito obrigatório).
- Rhodes: jRhodes3d (CC BY-NC: só para uso não comercial; se a app for monetizada, retirar `samples/ep.mp3`).
- Baixos elétricos (Black and Blue), bateria Big Rusty Drums, contrabaixo Meatbass: Karoryfer Samples (CC0).
- Bateria de jazz: Virtuosity Drums, Versilian Studios e Karoryfer Samples (CC0).
- Vibrafone e percussão latina: Versilian Community Sample Library (CC0).
- Órgão e outros sons de recurso: FluidR3 (MIT).

## Publicar no GitHub

1. Carregar o conteúdo desta pasta para a raiz do repositório (o `index.html` tem de ficar na raiz, não dentro de uma subpasta).
2. Em **Settings → Pages**, escolher o ramo `main` e a pasta `/ (root)`.
3. Esperar pelo visto verde em **Actions** e abrir o link indicado em Settings → Pages; recarregar com Cmd+Shift+R (ou Ctrl+Shift+R).
