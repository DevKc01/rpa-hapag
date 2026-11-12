function (input) {
  // Extrai containers e eventos da pagina nova de Tracking da Hapag-Lloyd (Vue/Quasar).
  // Retorna JSON: { containers: [{tipo, container, status, data, local}],
  //                 eventos:    [{status, local, data, hora, transporte, viagem}] }
  // "eventos" sao os do PRIMEIRO container (mesmo contrato do fluxo anterior).
  // Usa textContent (nao innerText) para ler tambem os detalhes recolhidos (hora/transporte/viagem).
  var limpar = function (s) { return (s || '').replace(/\s+/g, ' ').trim(); };
  var texto = function (el) { return el ? limpar(el.textContent) : ''; };
  var resultado = { containers: [], eventos: [] };

  var tabela = document.querySelector('table.q-table');
  if (!tabela) { return JSON.stringify(resultado); }

  var padraoContainer = /^[A-Z]{4}\s?\d{6,7}$/;
  var linhas = Array.prototype.slice.call(tabela.querySelectorAll('tbody > tr'));

  var lerEventos = function (trEventos) {
    if (!trEventos) { return []; }
    return Array.prototype.slice.call(trEventos.querySelectorAll('.hal-event')).map(function (card) {
      var micro = card.querySelectorAll('.hal-micro-data__content');
      var itens = card.querySelectorAll('.hal-data-item__content');
      return {
        status: texto(micro[0]),
        local: texto(card.querySelector('.hal-event__title')),
        data: texto(micro[1]),
        hora: texto(itens[0]),
        transporte: texto(itens[1]),
        viagem: texto(itens[2])
      };
    });
  };

  linhas.forEach(function (tr) {
    var tds = tr.querySelectorAll(':scope > td');
    if (tds.length < 6) { return; }
    var container = texto(tds[0]).replace(/\s+/g, '');
    if (!padraoContainer.test(container)) { return; }

    var eventos = lerEventos(tr.nextElementSibling);
    var ultimo = texto(tds[4]);
    var dataHora = '';
    var status = '';
    var local = '';

    var m = /^(.*?)\s+on\s+(\d{4}-\d{2}-\d{2}(?:\s+\d{2}:\d{2})?)$/.exec(ultimo);
    if (m) {
      dataHora = m[2];
      var dia = dataHora.slice(0, 10);
      var hora = dataHora.slice(11);
      // "Gated out CHICAGO, IL": status e local vem colados; resolve pelo card correspondente.
      var card = eventos.filter(function (e) {
        return e.data === dia && (!hora || e.hora === hora) && ultimo.indexOf(e.status) === 0 && ultimo.indexOf(e.local) > -1;
      })[0];
      if (card) {
        status = card.status;
        local = card.local;
      } else {
        // Plano B: o local vem em MAIUSCULAS ("CHICAGO, IL"); o status em caixa mista.
        var sep = /^(.*?)\s+([A-Z0-9][A-Z0-9 .,'\-\/()]*)$/.exec(m[1]);
        status = sep ? sep[1] : m[1];
        local = sep ? sep[2] : '';
      }
    } else {
      status = ultimo;
    }

    resultado.containers.push({
      tipo: texto(tds[3]),
      container: container,
      status: status,
      data: dataHora,
      local: local
    });
    if (resultado.eventos.length === 0 && eventos.length > 0) { resultado.eventos = eventos; }
  });

  return JSON.stringify(resultado);
}
