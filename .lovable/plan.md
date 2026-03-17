
Objetivo

Reorganizar a página de Importação Automática para remover os cards informativos em quadrados (“Importação Rápida”, “Anti-Duplicados”, etc.) da área acima do preview e reaproveitar esse conteúdo abaixo do preview, onde ele ficará mais contextual e menos poluído visualmente.

O que existe hoje
- Em `src/pages/ImportacaoAutomatica.tsx`, há um bloco “Recursos da Importação” com 4 cards logo acima de `ImportPreview`.
- A página também já tem uma seção “Como usar” abaixo do preview.
- O `ImportPreview` já concentra os filtros, badges, status e ações principais, então os cards de recursos acima dele competem por atenção com o conteúdo realmente importante.

Minha sugestão
Eu recomendo mover essas informações para baixo do preview, em vez de simplesmente remover.

Por quê
- O usuário chega nessa tela querendo ver conteúdos e importar, então o preview deve aparecer mais cedo.
- Os benefícios do sistema (“rápida”, “anti-duplicados”, “multi-tabelas”, “sync”) funcionam melhor como apoio depois que o usuário já entendeu o preview.
- Isso reduz a sensação de “muitos blocos” no topo e deixa a página mais objetiva.

Plano de implementação

1. Reordenar a hierarquia da página
- Remover o bloco `Recursos da Importação` da posição atual, acima do `ImportPreview`.
- Colocar esse bloco abaixo do `ImportPreview`.

2. Melhorar a apresentação da seção movida
- Em vez de manter exatamente o mesmo grid “solto”, transformar em uma seção secundária mais discreta, por exemplo:
  - título curto como “Recursos da importação”
  - descrição curta explicando os benefícios
  - grid com visual mais leve que o atual
- Assim ela continua útil, mas sem competir com o topo da página.

3. Ajustar a ordem final recomendada
Ordem sugerida da página:
```text
Hero
Status/Credenciais
Configuração expansível
Preview dos conteúdos
Recursos da importação
Como usar
```

4. Refinar responsividade e densidade visual
- Manter o grid responsivo dos recursos (`1 / 2 / 4 colunas`).
- Reduzir um pouco o destaque visual desses cards após movê-los:
  - menos hover chamativo
  - menos gradiente forte
  - spacing mais compacto
- Isso ajuda a comunicar que é conteúdo complementar.

5. Opcional que eu sugiro junto
Se você quiser um resultado ainda mais limpo, eu sugiro fundir “Recursos da importação” com “Como usar” em uma única área inferior:
- lado 1: passos de uso
- lado 2: benefícios/recursos
Isso deixa a página mais organizada e evita duas seções informativas seguidas.

Recomendação final
Minha principal recomendação é:
- não remover essas informações do produto,
- mas tirar do topo e colocá-las abaixo do preview com menos destaque visual.

Resultado esperado
- O preview sobe na hierarquia e ganha protagonismo.
- A página fica mais limpa e objetiva.
- Os cards continuam úteis, mas no lugar certo.
- A experiência fica mais focada em ação e menos em apresentação.

Arquivos envolvidos
- `src/pages/ImportacaoAutomatica.tsx`

Detalhe técnico
- A mudança é majoritariamente estrutural no JSX.
- Não deve exigir alterações em lógica de estado, serviços ou no componente `ImportPreview`.
- O trabalho principal será reorganizar a ordem das seções e ajustar classes visuais dos cards informativos.
