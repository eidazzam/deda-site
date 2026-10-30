import type { FastifyPluginAsync } from 'fastify';

import { prisma } from '../lib/prisma.js';

/**
 * Public site-config — the storefront calls this once per page render
 * to drive the footer's social links + WhatsApp contact button. The row
 * is upserted on first read so a fresh database always has something to
 * return (admin can edit it through /api/admin/site-config).
 */
export const siteConfigRoutes: FastifyPluginAsync = async (app) => {
  app.get('/site-config', async () => {
    const config = await prisma.siteConfig.upsert({
      where: { id: 1 },
      create: { id: 1 },
      update: {},
    });
    return {
      data: {
        whatsappNumber: config.whatsappNumber,
        facebookUrl: config.facebookUrl,
        instagramUrl: config.instagramUrl,
        tiktokUrl: config.tiktokUrl,
        editorialEyebrowEn:  config.editorialEyebrowEn,
        editorialEyebrowAr:  config.editorialEyebrowAr,
        editorialHeadlineEn: config.editorialHeadlineEn,
        editorialHeadlineAr: config.editorialHeadlineAr,
        editorialBodyEn:     config.editorialBodyEn,
        editorialBodyAr:     config.editorialBodyAr,
        editorialImageUrl:   config.editorialImageUrl,
      },
    };
  });
};
