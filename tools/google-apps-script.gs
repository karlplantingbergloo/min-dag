/**
 * Min dag – Google-skript
 *
 * Det här skriptet körs i ditt eget Google-konto. Det läser din kalender (de
 * närmaste dagarna) och de senaste trådarna i din Gmail-inkorg, och lämnar bara
 * ut dem till den som har rätt nyckel. Det ändrar, skickar eller raderar ingenting.
 *
 * Gör så här:
 *  1. Byt ut BYT-UT-MIG nedan mot din egen långa nyckel (behåll citattecknen).
 *  2. Distribuera som webbapp: "Kör som: Jag", "Vem har åtkomst: Alla".
 *  3. Klistra in webbappens adress och nyckeln under Mer i Min dag.
 */
const KEY = 'BYT-UT-MIG';

const DAYS = 3;           // idag + 2 dagar framåt
const MAIL_THREADS = 12;  // antal trådar från inkorgen
const TZ = 'Europe/Stockholm';

function doPost(e) {
  let body = {};
  try { body = JSON.parse(e.postData.contents); } catch (err) { /* tom fråga */ }
  if (!KEY || KEY === 'BYT-UT-MIG') return out_({ error: 'Nyckeln är inte inställd i skriptet' });
  if (body.key !== KEY) return out_({ error: 'Fel nyckel' });
  return out_({ events: events_(), mail: mail_() });
}

// Öppnar man adressen i en webbläsare ser man bara att skriptet är igång.
function doGet() {
  return out_({ ok: true, info: 'Min dag-skriptet är igång.' });
}

// Kör den här en gång i redigeraren för att ge skriptet tillåtelse att läsa.
function test() {
  Logger.log(JSON.stringify({ events: events_(), mail: mail_() }, null, 2));
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function events_() {
  const scriptTz = Session.getScriptTimeZone();
  const today = Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
  const start = Utilities.parseDate(today + ' 00:00', TZ, 'yyyy-MM-dd HH:mm');
  const end = new Date(start.getTime() + DAYS * 86400000 + 2 * 3600000);
  const list = [];
  CalendarApp.getAllCalendars().forEach(function (cal) {
    if (cal.isHidden() || !cal.isSelected()) return;
    cal.getEvents(start, end).forEach(function (ev) {
      const allDay = ev.isAllDayEvent();
      list.push({
        title: ev.getTitle() || '(utan titel)',
        allDay: allDay,
        start: allDay ? Utilities.formatDate(ev.getAllDayStartDate(), scriptTz, 'yyyy-MM-dd') : ev.getStartTime().toISOString(),
        end: allDay ? Utilities.formatDate(ev.getAllDayEndDate(), scriptTz, 'yyyy-MM-dd') : ev.getEndTime().toISOString(),
        location: ev.getLocation() || ''
      });
    });
  });
  list.sort(function (a, b) { return a.start < b.start ? -1 : a.start > b.start ? 1 : 0; });
  return list;
}

function mail_() {
  const threads = GmailApp.search('in:inbox', 0, MAIL_THREADS);
  return {
    unread: GmailApp.getInboxUnreadCount(),
    threads: threads.map(function (t) {
      const msgs = t.getMessages();
      const m = msgs[msgs.length - 1];
      return {
        id: t.getId(),
        from: name_(m.getFrom()),
        subject: t.getFirstMessageSubject() || '(inget ämne)',
        date: t.getLastMessageDate().toISOString(),
        snippet: m.getPlainBody().replace(/\s+/g, ' ').trim().slice(0, 140),
        unread: t.isUnread()
      };
    })
  };
}

function name_(from) {
  const m = String(from).match(/^\s*"?([^"<]+?)"?\s*<.+>\s*$/);
  return m ? m[1] : String(from);
}
