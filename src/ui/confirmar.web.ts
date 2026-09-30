// Na prévia web a confirmação é desenhada dentro da própria tela do celular,
// porque alguns navegadores (e visualizadores embutidos) bloqueiam window.confirm.
export function confirmar(titulo: string, mensagem: string, textoOk = 'Confirmar'): Promise<boolean> {
  return new Promise(resolve => {
    const raiz = document.getElementById('app') ?? document.body;
    const fundo = document.createElement('div');
    fundo.setAttribute('role', 'dialog');
    fundo.setAttribute('aria-modal', 'true');
    fundo.style.cssText = 'position:absolute;inset:0;z-index:100;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;padding:24px';
    const caixa = document.createElement('div');
    caixa.style.cssText = 'background:#fff;border-radius:16px;padding:20px;max-width:320px;width:100%;box-shadow:0 10px 30px rgba(0,0,0,.2);font-family:inherit';
    const h = document.createElement('div');
    h.textContent = titulo;
    h.style.cssText = 'font-size:18px;font-weight:700;color:#18211D;margin-bottom:8px';
    const p = document.createElement('div');
    p.textContent = mensagem;
    p.style.cssText = 'font-size:15px;color:#56625C;line-height:1.4;margin-bottom:16px';
    const linha = document.createElement('div');
    linha.style.cssText = 'display:flex;gap:8px;justify-content:flex-end';
    const botao = (t: string, cor: string, fundoCor: string, v: boolean) => {
      const b = document.createElement('button');
      b.textContent = t;
      b.style.cssText = `font:inherit;font-weight:700;font-size:15px;padding:10px 14px;border-radius:10px;border:1.5px solid ${cor};color:${fundoCor ? '#fff' : cor};background:${fundoCor || '#fff'};cursor:pointer`;
      b.onclick = () => { fundo.remove(); resolve(v); };
      return b;
    };
    linha.append(botao('Cancelar', '#146C43', '', false), botao(textoOk, '#B3261E', '#B3261E', true));
    caixa.append(h, p, linha);
    fundo.append(caixa);
    fundo.onclick = e => { if (e.target === fundo) { fundo.remove(); resolve(false); } };
    raiz.append(fundo);
  });
}
