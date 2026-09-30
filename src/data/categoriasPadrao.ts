import { Categoria } from '../domain/types';

/** RF04: categorias padrão, baseadas nas principais despesas do brasileiro */
export const CATEGORIAS_PADRAO: Omit<Categoria, 'id'>[] = [
  { nome: 'Salário', tipo: 'receita', cor: '#1B7F4B' },
  { nome: 'Trabalho extra', tipo: 'receita', cor: '#2E9E6A' },
  { nome: 'Benefícios', tipo: 'receita', cor: '#58B888' },
  { nome: 'Outras receitas', tipo: 'receita', cor: '#8CCFAC' },
  { nome: 'Moradia', tipo: 'despesa', cor: '#3B5BA9' },
  { nome: 'Supermercado', tipo: 'despesa', cor: '#D9822B' },
  { nome: 'Contas da casa', tipo: 'despesa', cor: '#7B61C9' },
  { nome: 'Transporte', tipo: 'despesa', cor: '#2A8FB8' },
  { nome: 'Saúde', tipo: 'despesa', cor: '#C94A6B' },
  { nome: 'Educação', tipo: 'despesa', cor: '#4F7D2F' },
  { nome: 'Lazer', tipo: 'despesa', cor: '#B8932A' },
  { nome: 'Dívidas e parcelas', tipo: 'despesa', cor: '#8E3B2F' },
  { nome: 'Outras despesas', tipo: 'despesa', cor: '#6B7280' },
];
