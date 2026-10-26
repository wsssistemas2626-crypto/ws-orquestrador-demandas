// Dependências que rota, Server Action, job e serviço recebem (G5). `obterDeps`, que monta as de produção, chega na T11.
import type pg from 'pg';
import type { Db } from '../db';
import type { Auth } from '../modules/acesso/auth';
import type { ConfigApp } from './env';
import type { Fila } from './fila';
import type { Relogio } from './relogio';

export type Deps = { db: Db; pool: pg.Pool; relogio: Relogio; fila: Fila; auth: Auth; config: ConfigApp };
