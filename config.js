// ═══════════════════════════════════════════════════════════════════
//  BUBBLE SISTERS — CONFIGURAÇÃO DA LOJA
//  Este é o único arquivo que você precisa editar para mudar preços,
//  WhatsApp, Instagram, frete e os produtos em destaque.
//
//  Cuidados ao editar:
//   • Mude só o que está depois dos dois-pontos.
//   • Textos ficam entre aspas duplas: "assim".
//   • Preços usam ponto, não vírgula: 39.90
//   • Toda linha termina com vírgula, MENOS a última de cada bloco.
//
//  A chave secreta do Mercado Pago NÃO fica aqui (este arquivo é público).
//  Ela fica em  pagamento/segredo.php
// ═══════════════════════════════════════════════════════════════════
window.BS_CONFIG = {

  "whatsapp": "551150511772",
  "whatsapp_exibir": "(11) 5051-1772",
  "instagram": "https://www.instagram.com/bubblesisters.co",
  "instagram_exibir": "@bubblesisters.co",
  "email_pedidos": "",

  "frete_gratis_acima_de": 150,
  "cep_origem": "04521-002",

  "frete": [
    { "regiao": "Cidade de São Paulo",         "valor": 12.90, "prazo": "1 a 2 dias úteis",  "ceps": [[1000, 5999], [8000, 8499]] },
    { "regiao": "Grande SP e interior de SP",  "valor": 18.90, "prazo": "2 a 4 dias úteis",  "ceps": [[6000, 7999], [8500, 19999]] },
    { "regiao": "RJ, MG e ES",                 "valor": 24.90, "prazo": "3 a 6 dias úteis",  "ceps": [[20000, 39999]] },
    { "regiao": "Sul",                         "valor": 27.90, "prazo": "4 a 7 dias úteis",  "ceps": [[80000, 99999]] },
    { "regiao": "Centro-Oeste",                "valor": 32.90, "prazo": "5 a 8 dias úteis",  "ceps": [[70000, 76799], [78000, 79999]] },
    { "regiao": "Nordeste",                    "valor": 38.90, "prazo": "6 a 10 dias úteis", "ceps": [[40000, 65999]] },
    { "regiao": "Norte",                       "valor": 45.90, "prazo": "8 a 14 dias úteis", "ceps": [[66000, 69999], [76800, 77999]] }
  ],

  "mercado_pago_ativo": true,

  "vitrine": ["bleu-absolu", "capim-limao", "petale-royale-rosee", "velvet-fig-e-cassis", "explosao-citrica"],

  "destaques": ["orvalho", "iris-de-provence", "slave-to-love", "coco", "explosao-herbal", "manteiga-noturna", "spray-lavanda-e-laranja-doce", "madeiras-sagradas"],

  "precos": {
    "padrao": 39.90,

    "afeto": 29.90,
    "bamboo": 27.90,
    "terra-molhada": 34.90,
    "madeiras-sagradas": 34.90,
    "clareira-de-luz": 34.90,
    "orvalho": 34.90,
    "allure-extreme": 29.90,
    "bleu-absolu": 29.90,
    "calandre-vintage": 29.90,
    "capim-limao": 28.90,
    "cho-ku-rei": 24.90,
    "coco": 17.90,
    "everything-soap": 7.90,
    "explosao-citrica": 27.90,
    "facial-hidratante": 37.90,
    "iris-de-provence": 29.90,
    "lhomme-sauvage": 29.90,
    "mentol-therapy": 29.90,
    "musk-e-amber": 29.90,
    "petale-royale": 34.90,
    "petale-royale-rosee": 34.90,
    "pitanga": 17.90,
    "sabonete-de-anil": 19.90,
    "sabonete-facial": 37.90,
    "sao-miguel-arcanjo": 19.90,
    "slave-to-love": 24.90,
    "sleep-time": 17.90,
    "vanilla": 27.90,
    "velvet-fig-e-cassis": 29.90,
    "wake-up": 24.90,

    "explosao-herbal": 27.90,
    "protecao-ancestral": 17.90,

    "manteiga-circulatoria": 19.90,
    "manteiga-noturna": 19.90,
    "roll-on-arnica": 44.90,

    "spray-bergamota-e-alecrim": 39.90,
    "spray-lavanda-e-laranja-doce": 39.90
  }

};
