<?php
// Cria o pagamento no Mercado Pago (Checkout Pro) a partir da sacola.
// Os preços e o frete são recalculados aqui, a partir do config.js: o que vem do navegador não é confiável.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

function sair($codigo, $msg) {
    http_response_code($codigo);
    echo json_encode(['erro' => $msg], JSON_UNESCAPED_UNICODE);
    exit;
}
function texto($v, $max = 120) {
    $v = trim(preg_replace('/\s+/u', ' ', (string) $v));
    return function_exists('mb_substr') ? mb_substr($v, 0, $max) : substr($v, 0, $max);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') sair(405, 'Método não permitido.');
$raiz = dirname(__DIR__);

// ── configuração (o mesmo config.js que o site usa) ──
$js = @file_get_contents($raiz . '/config.js');
if ($js === false) sair(500, 'Não encontrei o arquivo config.js.');
$linhas = array();
foreach (preg_split('/\R/', $js) as $l) { if (!preg_match('/^\s*\/\//', $l)) $linhas[] = $l; }
$txt = implode("\n", $linhas);
$ini = strpos($txt, '{'); $fim = strrpos($txt, '}');
$cfg = ($ini === false || $fim === false) ? null : json_decode(substr($txt, $ini, $fim - $ini + 1), true);
if (!is_array($cfg)) sair(500, 'O arquivo config.js tem um erro de formatação. Confira aspas e vírgulas.');

$produtos = json_decode((string) @file_get_contents(__DIR__ . '/produtos.json'), true);
if (!is_array($produtos)) sair(500, 'Não encontrei a lista de produtos.');

$segredo = @include __DIR__ . '/segredo.php';
$token = is_array($segredo) && isset($segredo['access_token']) ? trim($segredo['access_token']) : '';
if ($token === '' || strpos($token, 'COLE_AQUI') === 0) sair(503, 'O pagamento pelo site ainda não foi ativado.');

$in = json_decode((string) file_get_contents('php://input'), true);
if (!is_array($in)) sair(400, 'Pedido inválido.');

// ── itens ──
$precos = isset($cfg['precos']) && is_array($cfg['precos']) ? $cfg['precos'] : array();
$itens = array(); $resumo = array(); $subtotal = 0.0;
foreach ((isset($in['itens']) && is_array($in['itens']) ? $in['itens'] : array()) as $it) {
    $id = isset($it['id']) ? (string) $it['id'] : '';
    $q = isset($it['qtd']) ? (int) $it['qtd'] : 0;
    if (!isset($produtos[$id]) || $q < 1 || $q > 99) continue;
    $preco = isset($precos[$id]) && is_numeric($precos[$id]) ? (float) $precos[$id] : (isset($precos['padrao']) ? (float) $precos['padrao'] : 0.0);
    if ($preco <= 0) continue;
    $itens[] = array('id' => $id, 'title' => $produtos[$id], 'quantity' => $q, 'unit_price' => round($preco, 2), 'currency_id' => 'BRL');
    $resumo[] = $q . 'x ' . $produtos[$id] . ' (R$ ' . number_format($preco * $q, 2, ',', '.') . ')';
    $subtotal += $preco * $q;
}
if (!$itens) sair(400, 'Sua sacola está vazia.');

// ── cliente e endereço ──
$c = isset($in['cliente']) && is_array($in['cliente']) ? $in['cliente'] : array();
$cli = array();
foreach (array('nome', 'email', 'telefone', 'cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'uf') as $k) $cli[$k] = texto(isset($c[$k]) ? $c[$k] : '');
$cli['cep'] = preg_replace('/\D/', '', $cli['cep']);
$cli['uf'] = strtoupper(substr($cli['uf'], 0, 2));
if (strlen($cli['nome']) < 3 || !filter_var($cli['email'], FILTER_VALIDATE_EMAIL) || strlen(preg_replace('/\D/', '', $cli['telefone'])) < 10
    || strlen($cli['cep']) !== 8 || $cli['rua'] === '' || $cli['numero'] === '' || $cli['bairro'] === '' || $cli['cidade'] === '' || strlen($cli['uf']) !== 2) {
    sair(400, 'Confira seus dados e o endereço de entrega.');
}

// ── frete por região ──
$n = (int) substr($cli['cep'], 0, 5); $regiao = null;
foreach ((isset($cfg['frete']) && is_array($cfg['frete']) ? $cfg['frete'] : array()) as $r) {
    foreach ((isset($r['ceps']) && is_array($r['ceps']) ? $r['ceps'] : array()) as $faixa) {
        if (is_array($faixa) && count($faixa) === 2 && $n >= (int) $faixa[0] && $n <= (int) $faixa[1]) { $regiao = $r; break 2; }
    }
}
if (!$regiao) sair(400, 'Não encontramos esse CEP.');
$limite = isset($cfg['frete_gratis_acima_de']) ? (float) $cfg['frete_gratis_acima_de'] : 0.0;
$frete = ($limite > 0 && $subtotal >= $limite) ? 0.0 : (float) $regiao['valor'];
if ($frete > 0) $itens[] = array('id' => 'frete', 'title' => 'Frete: ' . $regiao['regiao'], 'quantity' => 1, 'unit_price' => round($frete, 2), 'currency_id' => 'BRL');
$total = $subtotal + $frete;

// ── registro do pedido ──
try { $sufixo = strtoupper(bin2hex(random_bytes(3))); } catch (Exception $e) { $sufixo = strtoupper(substr(md5(uniqid('', true)), 0, 6)); }
$pedido = 'BS' . date('ymd') . '-' . $sufixo;
$registro = array('pedido' => $pedido, 'criado_em' => date('c'), 'situacao' => 'aguardando pagamento no Mercado Pago',
    'cliente' => $cli, 'itens' => $resumo, 'subtotal' => round($subtotal, 2), 'frete' => round($frete, 2), 'regiao' => $regiao['regiao'], 'total' => round($total, 2));
$pasta = $raiz . '/pedidos';
if (is_dir($pasta) && is_writable($pasta)) @file_put_contents($pasta . '/' . $pedido . '.json', json_encode($registro, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));

$destino = isset($cfg['email_pedidos']) ? trim($cfg['email_pedidos']) : '';
if ($destino !== '' && filter_var($destino, FILTER_VALIDATE_EMAIL)) {
    $corpo = "Pedido $pedido iniciado no site (aguardando confirmação do pagamento no Mercado Pago).\n\n"
        . implode("\n", $resumo) . "\n\nSubtotal: R$ " . number_format($subtotal, 2, ',', '.')
        . "\nFrete (" . $regiao['regiao'] . "): " . ($frete > 0 ? 'R$ ' . number_format($frete, 2, ',', '.') : 'grátis')
        . "\nTotal: R$ " . number_format($total, 2, ',', '.')
        . "\n\nCliente: {$cli['nome']}\nE-mail: {$cli['email']}\nWhatsApp: {$cli['telefone']}"
        . "\nEndereço: {$cli['rua']}, {$cli['numero']}" . ($cli['complemento'] !== '' ? " ({$cli['complemento']})" : '')
        . " — {$cli['bairro']}, {$cli['cidade']}/{$cli['uf']} — CEP {$cli['cep']}\n\nConfira no aplicativo do Mercado Pago se o pagamento do pedido $pedido foi aprovado antes de enviar.";
    $host = preg_replace('/[^a-z0-9.\-]/i', '', isset($_SERVER['HTTP_HOST']) ? $_SERVER['HTTP_HOST'] : 'localhost');
    @mail($destino, "Pedido $pedido - Bubble Sisters", $corpo, "From: loja@$host\r\nReply-To: {$cli['email']}\r\nContent-Type: text/plain; charset=utf-8");
}

// ── preferência de pagamento ──
$https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https');
$caminho = rtrim(str_replace('\\', '/', dirname(dirname($_SERVER['SCRIPT_NAME']))), '/');
$base = ($https ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST'] . $caminho . '/';
$volta = $base . 'obrigado/?pedido=' . $pedido;
$partes = explode(' ', $cli['nome'], 2);
$pref = array(
    'items' => $itens,
    'payer' => array('name' => $partes[0], 'surname' => isset($partes[1]) ? $partes[1] : '', 'email' => $cli['email']),
    'external_reference' => $pedido,
    'back_urls' => array('success' => $volta, 'pending' => $volta, 'failure' => $volta),
    'statement_descriptor' => 'BUBBLE SISTERS',
    'metadata' => array('pedido' => $pedido),
);
if ($https) $pref['auto_return'] = 'approved';

if (!function_exists('curl_init')) sair(500, 'O servidor não tem o recurso cURL ativado.');
$ch = curl_init('https://api.mercadopago.com/checkout/preferences');
curl_setopt_array($ch, array(
    CURLOPT_POST => true,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_HTTPHEADER => array('Content-Type: application/json', 'Authorization: Bearer ' . $token),
    CURLOPT_POSTFIELDS => json_encode($pref, JSON_UNESCAPED_UNICODE),
));
$resp = curl_exec($ch);
$http = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$dados = is_string($resp) ? json_decode($resp, true) : null;
if ($http < 200 || $http >= 300 || !is_array($dados) || empty($dados['init_point'])) {
    sair(502, $http === 401 || $http === 403 ? 'A chave do Mercado Pago não foi aceita.' : 'O Mercado Pago não respondeu agora.');
}
echo json_encode(array('url' => $dados['init_point'], 'pedido' => $pedido), JSON_UNESCAPED_UNICODE);
