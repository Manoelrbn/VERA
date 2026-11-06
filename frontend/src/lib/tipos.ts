export type Usuario = { id: number; nome: string; email: string; plano: 'gratis' | 'pro' };

export type Uso = {
  plano: string;
  editais_mes: number; editais_limite: number | null;
  questoes_mes: number; questoes_limite: number | null;
  mensagens_24h: number; mensagens_limite: number;
};

export type EditalResumo = {
  id: number; titulo: string; nome_arquivo: string;
  status: 'processando' | 'pronto' | 'erro'; criado_em: string;
};

export type Analise = {
  titulo: string; orgao: string | null; banca: string | null; resumo: string;
  cargos: { nome: string; vagas: string | null; salario: string | null; escolaridade: string | null }[];
  datas: { evento: string; data: string; importante: boolean }[];
  requisitos: string[]; etapas: string[];
  materias: { nome: string; topicos: string[]; peso: string | null }[];
  atencao: string[];
};

export type Edital = EditalResumo & { mensagem_erro: string; analise: Analise | null };

export type Questao = {
  id: number; materia: string; enunciado: string;
  alternativas: { letra: string; texto: string }[]; dificuldade: string;
};

export type Correcao = { acertou: boolean; correta: string; explicacao: string };

export type Mensagem = { id: number; papel: 'aluno' | 'vera'; conteudo: string; criado_em: string };

export type Desempenho = {
  respondidas: number; acertos: number; aproveitamento: number | null;
  materias: { materia: string; respondidas: number; acertos: number; aproveitamento: number }[];
};
