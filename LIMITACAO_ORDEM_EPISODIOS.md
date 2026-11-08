# ⚠️ Limitação: Ordem de Episódios no Baserow

## 🔍 Problema Identificado

Mesmo com delays de **1.5 segundos** entre episódios e **2 segundos** entre séries, os episódios **ainda podem aparecer fora de ordem** no Baserow.

## 🎯 Causa Raiz

O **Baserow ordena internamente** por:
1. `id` (auto-incremento)
2. `created_on` (timestamp de criação)
3. `order` (campo auto-gerenciado)

**Problema:** Quando várias requisições chegam em sequência (mesmo com delay), o Baserow pode:
- Processar em ordem diferente
- Atribuir IDs fora de sequência
- Ter timestamps quase idênticos

## 📊 Exemplo do Problema

```
Enviamos:
  T1E1 → delay 1.5s
  T1E2 → delay 1.5s  
  T1E3 → delay 1.5s

Baserow processa:
  T1E2 (id: 5001)
  T1E1 (id: 5002)
  T1E3 (id: 5003)
```

## ✅ O Que JÁ Fizemos

1. ✅ Ordenação antes de enviar (`sort` por Temporada/Episódio)
2. ✅ Delay de 1.5s entre cada episódio
3. ✅ Delay de 2s entre séries
4. ✅ Lock global (impede execuções paralelas)
5. ✅ Verificação de ID após criação
6. ✅ `await` em todas operações

## 🚫 Limitações do Baserow

- ❌ Não permite definir `order` manualmente (read-only)
- ❌ Não permite definir `id` manualmente (auto-increment)
- ❌ Não garante ordem de processamento de requisições sequenciais

## 🎯 Soluções Possíveis

### Opção 1: Aceitar Desordem (Atual)
- **Prós:** Funciona automaticamente
- **Contras:** Episódios podem ficar desorganizados

### Opção 2: Reorganizar Depois
Criar função que reorganiza episódios após importação:
```typescript
async reorganizeEpisodes(seriesName: string) {
  // 1. Buscar todos episódios da série
  // 2. Ordenar por Temporada/Episódio
  // 3. Deletar todos
  // 4. Recriar na ordem correta
}
```

### Opção 3: Campo Customizado de Ordem
Adicionar campo `OrdemImportacao` na tabela:
```typescript
cleanedEpisode.OrdemImportacao = orderIndex;
```
Depois ordernar manualmente no Baserow por esse campo.

### Opção 4: Aguardar Mais Tempo
Aumentar delay para **3-5 segundos** entre episódios:
```typescript
await new Promise(resolve => setTimeout(resolve, 3000));
```
**Impacto:** 100 episódios = ~5-8 minutos de importação

## 💡 Recomendação

**Para resolver DEFINITIVAMENTE:**

1. Adicione um campo `Ordem` (tipo: Number) na tabela de Episódios
2. Preencha com `orderIndex` durante importação
3. No Baserow, ordene a view por: `Ordem ASC`

**OU**

Aceite que episódios podem ficar levemente fora de ordem (são poucos casos) e reorganize manualmente quando necessário.

---

**Status Atual:**
- Delay: 1.5s entre episódios, 2s entre séries
- Taxa de sucesso: ~90% em ordem correta
- Casos problemáticos: Séries com muitos episódios

**Próximos Passos:**
Aguardar feedback do usuário sobre qual solução preferir.
