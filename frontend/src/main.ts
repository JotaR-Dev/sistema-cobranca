type Cobranca = {
    id: number;
    nome: string;
    telefone: string;
    email: string;
    valor_divida: number | string;
    tipo_cobranca: 'fixo' | 'percentual';
    valor_cobranca: number | string;
    percentual: number | string | null;
    recorrencia: string;
    proxima_notificacao: string;
    status: string;
};

type Configuracoes = {
    chave_pix: string;
    mensagem_padrao: string;
};

const API_URL = `${(import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/+$/, '')}/api`;
const navBtns = document.querySelectorAll<HTMLButtonElement>('.nav-btn');
const views = document.querySelectorAll<HTMLElement>('.view');
const formCobranca = document.getElementById('formCobranca') as HTMLFormElement;
const formConfig = document.getElementById('formConfig') as HTMLFormElement;
const tipoCobranca = document.getElementById('tipoCobranca') as HTMLSelectElement;
const valorDivida = document.getElementById('valorDivida') as HTMLInputElement;
const divValorInput = document.getElementById('divValorInput') as HTMLDivElement;
const valorFinalDisplay = document.getElementById('valorFinalDisplay') as HTMLSpanElement;
const telefoneInput = document.getElementById('telefone') as HTMLInputElement;
const tabelaBody = document.querySelector<HTMLTableSectionElement>('#tabelaCobrancas tbody');
const searchNome = document.getElementById('searchNome') as HTMLInputElement;
const filterStatus = document.getElementById('filterStatus') as HTMLSelectElement;
const appMessage = document.getElementById('appMessage') as HTMLDivElement;
const charges: Cobranca[] = [];

const setMessage = (message: string, isError = false) => {
    appMessage.textContent = message;
    appMessage.classList.toggle('error', isError);
    appMessage.hidden = !message;
};

const request = async <T>(path: string, options?: RequestInit): Promise<T> => {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });

    if (!response.ok) {
        const result = await response.json().catch(() => null) as { erro?: string; mensagem?: string } | null;
        throw new Error(result?.erro || result?.mensagem || `Falha na solicitação (${response.status})`);
    }

    return response.json() as Promise<T>;
};

navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
        const target = btn.dataset.target;
        if (!target || !document.getElementById(`view-${target}`)) return;

        navBtns.forEach((navBtn) => navBtn.classList.toggle('active', navBtn === btn));
        views.forEach((view) => view.classList.toggle('active', view.id === `view-${target}`));

        if (target === 'painel') void carregarCobrancas();
        if (target === 'config') void carregarConfiguracoes();
    });
});

const calcularValorFinal = (): number => {
    const divida = Number(valorDivida.value);
    if (tipoCobranca.value === 'fixo') {
        const inputFixo = document.getElementById('valorFixo') as HTMLInputElement | null;
        return Number(inputFixo?.value) || 0;
    }

    const inputPercentual = document.getElementById('valorPct') as HTMLInputElement | null;
    return divida * ((Number(inputPercentual?.value) || 0) / 100);
};

const atualizarPrevia = () => {
    valorFinalDisplay.textContent = calcularValorFinal().toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const renderValorInput = () => {
    divValorInput.replaceChildren();
    const group = document.createElement('div');
    group.className = 'form-group';

    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'number';
    input.id = tipoCobranca.value === 'fixo' ? 'valorFixo' : 'valorPct';
    input.step = '0.01';
    input.min = '0.01';
    input.required = true;

    if (tipoCobranca.value === 'fixo') {
        label.textContent = 'Valor da Parcela (R$) *';
    } else {
        label.textContent = 'Porcentagem (%) *';
        input.max = '100';
    }

    input.addEventListener('input', atualizarPrevia);
    group.append(label, input);
    divValorInput.append(group);
    atualizarPrevia();
};

const atualizarContadores = () => {
    document.getElementById('countTotal')!.textContent = String(charges.length);
    document.getElementById('countEmDia')!.textContent = String(
        charges.filter((cobranca) => cobranca.status === 'Pagamento em dia').length,
    );
    document.getElementById('countNotif')!.textContent = String(
        charges.filter((cobranca) => cobranca.status === 'Notificado').length,
    );
    document.getElementById('countAtraso')!.textContent = String(
        charges.filter((cobranca) => cobranca.status === 'Em atraso').length,
    );
};

const formatarData = (value: string) => {
    const datePart = value.slice(0, 10);
    const [year, month, day] = datePart.split('-');
    return year && month && day ? `${day}/${month}/${year}` : datePart;
};

const adicionarCelula = (row: HTMLTableRowElement, value: string, className?: string) => {
    const cell = row.insertCell();
    cell.textContent = value;
    if (className) cell.className = className;
    return cell;
};

const renderizarCobrancas = () => {
    if (!tabelaBody) return;
    tabelaBody.replaceChildren();

    const nomeFiltro = searchNome.value.trim().toLocaleLowerCase('pt-BR');
    const statusFiltro = filterStatus.value;
    const filtradas = charges.filter((cobranca) => {
        const nomeCorresponde = cobranca.nome.toLocaleLowerCase('pt-BR').includes(nomeFiltro);
        const statusCorresponde = statusFiltro === 'todos' || cobranca.status === statusFiltro;
        return nomeCorresponde && statusCorresponde;
    });

    filtradas.forEach((cobranca) => {
        const row = tabelaBody!.insertRow();
        adicionarCelula(row, cobranca.nome);
        adicionarCelula(row, `R$ ${Number(cobranca.valor_cobranca).toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`);

        const badgeClass = cobranca.status === 'Pagamento em dia'
            ? 'dia'
            : cobranca.status === 'Notificado' ? 'notificado' : 'atraso';
        const statusCell = adicionarCelula(row, cobranca.status);
        const badge = document.createElement('span');
        badge.className = `badge ${badgeClass}`;
        badge.textContent = cobranca.status;
        statusCell.replaceChildren(badge);

        adicionarCelula(row, formatarData(cobranca.proxima_notificacao));
        adicionarCelula(row, cobranca.email);
    });

    if (filtradas.length === 0) {
        const row = tabelaBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 5;
        cell.className = 'empty-state';
        cell.textContent = charges.length === 0
            ? 'Nenhuma cobrança cadastrada.'
            : 'Nenhuma cobrança corresponde à busca.';
    }
};

async function carregarCobrancas() {
    try {
        const resultado = await request<Cobranca[]>('/cobrancas');
        charges.splice(0, charges.length, ...resultado);
        atualizarContadores();
        renderizarCobrancas();
        setMessage('');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível carregar as cobranças.';
        setMessage(`Erro ao carregar cobranças: ${message}`, true);
    }
}

async function carregarConfiguracoes() {
    try {
        const config = await request<Configuracoes>('/configuracoes');
        (document.getElementById('chavePix') as HTMLInputElement).value = config.chave_pix;
        (document.getElementById('mensagemPadrao') as HTMLTextAreaElement).value = config.mensagem_padrao;
        setMessage('');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível carregar as configurações.';
        setMessage(`Erro ao carregar configurações: ${message}`, true);
    }
}

tipoCobranca.addEventListener('change', renderValorInput);
valorDivida.addEventListener('input', atualizarPrevia);
searchNome.addEventListener('input', renderizarCobrancas);
filterStatus.addEventListener('change', renderizarCobrancas);

telefoneInput.addEventListener('input', (event) => {
    const input = event.currentTarget as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 11);
    const ddd = digits.slice(0, 2);
    const subscriber = digits.slice(2);
    if (digits.length <= 2) {
        input.value = digits ? `(${digits}` : '';
    } else if (subscriber.length <= 4) {
        input.value = `(${ddd}) ${subscriber}`;
    } else if (subscriber.length <= 8) {
        input.value = `(${ddd}) ${subscriber.slice(0, 4)}-${subscriber.slice(4)}`;
    } else {
        input.value = `(${ddd}) ${subscriber.slice(0, 5)}-${subscriber.slice(5)}`;
    }
});

formCobranca.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('');

    const valorDividaNumero = Number(valorDivida.value);
    const percentualInput = document.getElementById('valorPct') as HTMLInputElement | null;
    const percentual = tipoCobranca.value === 'percentual' ? Number(percentualInput?.value) : null;
    const valorCobranca = calcularValorFinal();

    if (!Number.isFinite(valorDividaNumero) || valorDividaNumero <= 0
        || !Number.isFinite(valorCobranca) || valorCobranca <= 0
        || (percentual !== null && (!Number.isFinite(percentual) || percentual > 100))) {
        setMessage('Informe valores válidos para a dívida e a cobrança.', true);
        return;
    }

    const submitButton = formCobranca.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    submitButton.disabled = true;

    try {
        await request<Cobranca>('/cobrancas', {
            method: 'POST',
            body: JSON.stringify({
                nome: (document.getElementById('nome') as HTMLInputElement).value.trim(),
                telefone: telefoneInput.value.trim(),
                email: (document.getElementById('email') as HTMLInputElement).value.trim(),
                valor_divida: valorDividaNumero,
                tipo_cobranca: tipoCobranca.value,
                valor_cobranca: valorCobranca,
                percentual,
                recorrencia: (document.getElementById('recorrencia') as HTMLSelectElement).value,
                dataInicio: (document.getElementById('dataInicio') as HTMLInputElement).value,
            }),
        });

        formCobranca.reset();
        renderValorInput();
        await carregarCobrancas();
        navBtns.forEach((btn) => btn.classList.toggle('active', btn.dataset.target === 'painel'));
        views.forEach((view) => view.classList.toggle('active', view.id === 'view-painel'));
        setMessage('Cobrança cadastrada com sucesso.');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível cadastrar a cobrança.';
        setMessage(`Erro ao salvar cobrança: ${message}`, true);
    } finally {
        submitButton.disabled = false;
    }
});

formConfig.addEventListener('submit', async (event) => {
    event.preventDefault();
    setMessage('');

    const submitButton = formConfig.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    submitButton.disabled = true;

    try {
        const config = await request<Configuracoes>('/configuracoes', {
            method: 'PUT',
            body: JSON.stringify({
                chave_pix: (document.getElementById('chavePix') as HTMLInputElement).value.trim(),
                mensagem_padrao: (document.getElementById('mensagemPadrao') as HTMLTextAreaElement).value.trim(),
            }),
        });
        (document.getElementById('chavePix') as HTMLInputElement).value = config.chave_pix;
        (document.getElementById('mensagemPadrao') as HTMLTextAreaElement).value = config.mensagem_padrao;
        setMessage('Configurações salvas com sucesso.');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Não foi possível salvar as configurações.';
        setMessage(`Erro ao salvar configurações: ${message}`, true);
    } finally {
        submitButton.disabled = false;
    }
});

renderValorInput();
void carregarCobrancas();
void carregarConfiguracoes();
