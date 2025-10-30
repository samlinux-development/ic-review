import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { getProposals } from './proposals.js';
import { sendProposalsByConfig } from './email.js';
import { logger } from './logger.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// helper moved to proposals.js

app.get('/', (_req, res) => {
  res.json({ status: 'ok' });
});

function startHourlyRefresh() {
  const ONE_HOUR_MS = 60 * 60 * 1000; 
  const run = async () => {
    try {
      // OPEN proposals
      const result = await getProposals({ status: 'OPEN' });
      logger.info({ count: result.length }, 'background refresh completed');
      
      if (result && Array.isArray(result) && result.length > 0) 
        {
        try {
          const mail = await sendProposalsByConfig({ proposals: result, dedupe: true });
          if (mail?.sent) {
            logger.info({ recipients: mail.results.map(r => r.to) }, 'proposals email sent');
          } else {
            logger.warn({ reason: mail?.reason || 'unknown' }, 'proposals email not sent');
          }
        } catch (emailErr) {
          logger.error({ err: emailErr }, 'sending proposals email failed');
        }
      }
    } catch (err) {
      logger.warn({ err }, 'background refresh failed');
    }
  };
  run();
  setInterval(run, ONE_HOUR_MS);
}

app.listen(PORT, () => {
  logger.info({ port: PORT }, 'IC Review backend listening');
  startHourlyRefresh();
});


