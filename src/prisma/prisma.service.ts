import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Exécute un callback dans une transaction avec le contexte RLS.
   * SET app.current_user_id et app.current_user_role sont définis
   * en début de transaction pour que les policies PostgreSQL s'appliquent.
   */
  async $withRLS<T>(
    userId: string,
    role: string,
    fn: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.$transaction(async (tx) => {
      // Paramètres settés via requête paramétrée pour éviter l'injection SQL
      await tx.$executeRaw`SELECT set_config('app.current_user_id', ${userId}, true)`;
      await tx.$executeRaw`SELECT set_config('app.current_user_role', ${role}, true)`;
      return fn(tx);
    });
  }
}
