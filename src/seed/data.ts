/**
 * Deterministic seed dataset — 50 synthetic customer records.
 *
 * Distribution:
 * - CUST-001 to CUST-040: completely valid records
 * - CUST-041 to CUST-044: invalid email values
 * - CUST-045 to CUST-047: missing/null values
 * - CUST-048: invalid date_of_birth
 * - CUST-049: invalid phone value
 * - CUST-050: multiple issues (null email + invalid phone)
 *
 * All names, emails, and phone numbers are entirely synthetic.
 * No real personal information is used.
 */

export interface SeedCustomer {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  date_of_birth: string | null;
}

export const seedCustomers: SeedCustomer[] = [
  // ── Valid records (CUST-001 through CUST-040) ──────────────────────

  { id: "CUST-001", first_name: "Aarav",    last_name: "Sharma",    email: "aarav.sharma@example.com",      phone: "+1-555-0101", date_of_birth: "1990-03-15" },
  { id: "CUST-002", first_name: "Mei",      last_name: "Chen",      email: "mei.chen@example.com",          phone: "+1-555-0102", date_of_birth: "1985-07-22" },
  { id: "CUST-003", first_name: "Oluwaseun",last_name: "Adeyemi",   email: "oluwaseun.adeyemi@example.com", phone: "+1-555-0103", date_of_birth: "1992-11-03" },
  { id: "CUST-004", first_name: "Sofia",    last_name: "Rossi",     email: "sofia.rossi@example.com",       phone: "+1-555-0104", date_of_birth: "1988-01-30" },
  { id: "CUST-005", first_name: "Liam",     last_name: "O'Brien",   email: "liam.obrien@example.com",       phone: "+1-555-0105", date_of_birth: "1995-06-17" },
  { id: "CUST-006", first_name: "Yuki",     last_name: "Tanaka",    email: "yuki.tanaka@example.com",       phone: "+1-555-0106", date_of_birth: "1993-09-08" },
  { id: "CUST-007", first_name: "Fatima",   last_name: "Al-Rashid", email: "fatima.alrashid@example.com",   phone: "+1-555-0107", date_of_birth: "1991-12-25" },
  { id: "CUST-008", first_name: "Carlos",   last_name: "Mendoza",   email: "carlos.mendoza@example.com",    phone: "+1-555-0108", date_of_birth: "1987-04-12" },
  { id: "CUST-009", first_name: "Ingrid",   last_name: "Svensson",  email: "ingrid.svensson@example.com",   phone: "+1-555-0109", date_of_birth: "1994-02-28" },
  { id: "CUST-010", first_name: "Dmitri",   last_name: "Volkov",    email: "dmitri.volkov@example.com",     phone: "+1-555-0110", date_of_birth: "1986-08-19" },

  { id: "CUST-011", first_name: "Priya",    last_name: "Patel",     email: "priya.patel@example.com",       phone: "+1-555-0111", date_of_birth: "1996-05-07" },
  { id: "CUST-012", first_name: "Noah",     last_name: "Fischer",   email: "noah.fischer@example.com",      phone: "+1-555-0112", date_of_birth: "1989-10-14" },
  { id: "CUST-013", first_name: "Amara",    last_name: "Okafor",    email: "amara.okafor@example.com",      phone: "+1-555-0113", date_of_birth: "1997-01-21" },
  { id: "CUST-014", first_name: "Lucas",    last_name: "Dubois",    email: "lucas.dubois@example.com",      phone: "+1-555-0114", date_of_birth: "1984-03-09" },
  { id: "CUST-015", first_name: "Hana",     last_name: "Kim",       email: "hana.kim@example.com",          phone: "+1-555-0115", date_of_birth: "1998-07-03" },
  { id: "CUST-016", first_name: "Erik",     last_name: "Johansson", email: "erik.johansson@example.com",    phone: "+1-555-0116", date_of_birth: "1983-11-16" },
  { id: "CUST-017", first_name: "Zara",     last_name: "Hassan",    email: "zara.hassan@example.com",       phone: "+1-555-0117", date_of_birth: "1999-04-25" },
  { id: "CUST-018", first_name: "Marco",    last_name: "Bianchi",   email: "marco.bianchi@example.com",     phone: "+1-555-0118", date_of_birth: "1982-06-30" },
  { id: "CUST-019", first_name: "Aisha",    last_name: "Mohammed",  email: "aisha.mohammed@example.com",    phone: "+1-555-0119", date_of_birth: "1991-09-11" },
  { id: "CUST-020", first_name: "Tomas",    last_name: "Novak",     email: "tomas.novak@example.com",       phone: "+1-555-0120", date_of_birth: "1990-12-05" },

  { id: "CUST-021", first_name: "Leila",    last_name: "Nazari",    email: "leila.nazari@example.com",      phone: "+1-555-0121", date_of_birth: "1993-02-14" },
  { id: "CUST-022", first_name: "James",    last_name: "Whitfield", email: "james.whitfield@example.com",   phone: "+1-555-0122", date_of_birth: "1987-08-08" },
  { id: "CUST-023", first_name: "Ananya",   last_name: "Gupta",     email: "ananya.gupta@example.com",      phone: "+1-555-0123", date_of_birth: "1995-05-19" },
  { id: "CUST-024", first_name: "Oscar",    last_name: "Lindqvist", email: "oscar.lindqvist@example.com",   phone: "+1-555-0124", date_of_birth: "1986-10-27" },
  { id: "CUST-025", first_name: "Chioma",   last_name: "Eze",       email: "chioma.eze@example.com",        phone: "+1-555-0125", date_of_birth: "1994-01-03" },
  { id: "CUST-026", first_name: "Viktor",   last_name: "Petrov",    email: "viktor.petrov@example.com",     phone: "+1-555-0126", date_of_birth: "1981-07-21" },
  { id: "CUST-027", first_name: "Elena",    last_name: "Morales",   email: "elena.morales@example.com",     phone: "+1-555-0127", date_of_birth: "1992-04-16" },
  { id: "CUST-028", first_name: "Ravi",     last_name: "Krishnan",  email: "ravi.krishnan@example.com",     phone: "+1-555-0128", date_of_birth: "1988-11-09" },
  { id: "CUST-029", first_name: "Isabella", last_name: "Santos",    email: "isabella.santos@example.com",   phone: "+1-555-0129", date_of_birth: "1996-03-22" },
  { id: "CUST-030", first_name: "Kenji",    last_name: "Nakamura",  email: "kenji.nakamura@example.com",    phone: "+1-555-0130", date_of_birth: "1985-06-14" },

  { id: "CUST-031", first_name: "Nadia",    last_name: "Kovalenko", email: "nadia.kovalenko@example.com",   phone: "+1-555-0131", date_of_birth: "1997-08-30" },
  { id: "CUST-032", first_name: "Hugo",     last_name: "Ferreira",  email: "hugo.ferreira@example.com",     phone: "+1-555-0132", date_of_birth: "1984-12-18" },
  { id: "CUST-033", first_name: "Sakura",   last_name: "Yamamoto",  email: "sakura.yamamoto@example.com",   phone: "+1-555-0133", date_of_birth: "1999-02-07" },
  { id: "CUST-034", first_name: "Andre",    last_name: "Müller",    email: "andre.mueller@example.com",     phone: "+1-555-0134", date_of_birth: "1983-09-24" },
  { id: "CUST-035", first_name: "Divya",    last_name: "Reddy",     email: "divya.reddy@example.com",       phone: "+1-555-0135", date_of_birth: "1991-06-11" },
  { id: "CUST-036", first_name: "Lars",     last_name: "Andersen",  email: "lars.andersen@example.com",     phone: "+1-555-0136", date_of_birth: "1980-04-03" },
  { id: "CUST-037", first_name: "Amina",    last_name: "Diallo",    email: "amina.diallo@example.com",      phone: "+1-555-0137", date_of_birth: "1998-10-29" },
  { id: "CUST-038", first_name: "Pavel",    last_name: "Kowalski",  email: "pavel.kowalski@example.com",    phone: "+1-555-0138", date_of_birth: "1982-01-15" },
  { id: "CUST-039", first_name: "Gabriela", last_name: "Rivera",    email: "gabriela.rivera@example.com",   phone: "+1-555-0139", date_of_birth: "1994-07-26" },
  { id: "CUST-040", first_name: "Soren",    last_name: "Berg",      email: "soren.berg@example.com",        phone: "+1-555-0140", date_of_birth: "1989-05-02" },

  // ── Invalid email records (CUST-041 through CUST-044) ──────────────

  { id: "CUST-041", first_name: "Raj",      last_name: "Malhotra",  email: "not-an-email",                  phone: "+1-555-0141", date_of_birth: "1990-03-10" },
  { id: "CUST-042", first_name: "Chloe",    last_name: "Martin",    email: "chloe@@double.com",             phone: "+1-555-0142", date_of_birth: "1993-08-22" },
  { id: "CUST-043", first_name: "Omar",     last_name: "Farouk",    email: "missing-domain@",               phone: "+1-555-0143", date_of_birth: "1987-11-05" },
  { id: "CUST-044", first_name: "Lin",      last_name: "Wei",       email: "@no-local-part.com",            phone: "+1-555-0144", date_of_birth: "1995-02-18" },

  // ── Missing/null values (CUST-045 through CUST-047) ────────────────

  { id: "CUST-045", first_name: "Tariq",    last_name: "Abbas",     email: null,                            phone: "+1-555-0145", date_of_birth: "1992-06-09" },
  { id: "CUST-046", first_name: "Eva",      last_name: "Horvath",   email: "eva.horvath@example.com",       phone: null,          date_of_birth: "1988-04-17" },
  { id: "CUST-047", first_name: "Kwame",    last_name: "Asante",    email: "kwame.asante@example.com",      phone: "+1-555-0147", date_of_birth: null },

  // ── Invalid date_of_birth (CUST-048) ───────────────────────────────

  { id: "CUST-048", first_name: "Maria",    last_name: "Gonzalez",  email: "maria.gonzalez@example.com",    phone: "+1-555-0148", date_of_birth: "not-a-date" },

  // ── Invalid phone (CUST-049) ───────────────────────────────────────

  { id: "CUST-049", first_name: "Chen",     last_name: "Zhao",      email: "chen.zhao@example.com",         phone: "PHONE-INVALID", date_of_birth: "1991-07-13" },

  // ── Multiple issues (CUST-050) ─────────────────────────────────────

  { id: "CUST-050", first_name: "Ali",      last_name: "Yilmaz",    email: null,                            phone: "???",           date_of_birth: "1985-13-45" },
];
