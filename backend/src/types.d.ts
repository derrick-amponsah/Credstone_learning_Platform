import 'fastify';
declare module 'fastify' {
  interface FastifyInstance {
    role: (...roles: string[]) => (req: FastifyRequest, reply: FastifyReply) => Promise<any>;
  }
  interface FastifyRequest {
    uid: string;
    roles: string[];
  }
}
