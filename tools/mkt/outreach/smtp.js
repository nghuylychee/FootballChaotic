/* SMTP tối giản (TLS ngầm cổng 465, AUTH PLAIN) để không cần thư viện. Dùng Resend hoặc Gmail API nếu được; SMTP là đường dự phòng. */
import tls from 'node:tls';

export function sendSmtp({ host, port = 465, user, pass, from, to, raw }) {
  return new Promise((resolve, reject) => {
    const sock = tls.connect({ host, port: Number(port), servername: host }, () => {});
    let buf = '';
    const steps = [];
    const expect = (code, line) => { if (!line.startsWith(String(code))) throw new Error(`SMTP mong ${code}, nhận: ${line.trim()}`); };
    const fromAddr = from.match(/<([^>]+)>/) ? from.match(/<([^>]+)>/)[1] : from;
    const toAddr = to.match(/<([^>]+)>/) ? to.match(/<([^>]+)>/)[1] : to;
    const script = [
      [220, null],
      [250, `EHLO sfc-mkt-tools\r\n`],
      [235, `AUTH PLAIN ${Buffer.from(`\0${user}\0${pass}`).toString('base64')}\r\n`],
      [250, `MAIL FROM:<${fromAddr}>\r\n`],
      [250, `RCPT TO:<${toAddr}>\r\n`],
      [354, `DATA\r\n`],
      [250, raw.replace(/\r?\n/g, '\r\n').replace(/^\./gm, '..') + '\r\n.\r\n'],
      [221, `QUIT\r\n`],
    ];
    let i = 0;
    sock.setEncoding('utf8');
    sock.on('data', (d) => {
      buf += d;
      // một phản hồi hoàn chỉnh = dòng cuối có dạng "250 " (khoảng trắng sau mã)
      const lines = buf.split('\r\n').filter(Boolean);
      const last = lines[lines.length - 1];
      if (!last || !/^\d{3} /.test(last)) return;
      buf = '';
      try {
        expect(script[i][0], last);
        steps.push(last);
        i++;
        if (i >= script.length) { sock.end(); return resolve(steps); }
        if (script[i][1]) sock.write(script[i][1]);
      } catch (e) { sock.destroy(); reject(e); }
    });
    sock.on('error', reject);
    sock.on('timeout', () => { sock.destroy(); reject(new Error('SMTP timeout')); });
    sock.setTimeout(30000);
  });
}
