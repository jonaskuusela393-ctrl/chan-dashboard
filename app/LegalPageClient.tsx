"use client";

import type { PublicSiteConfig } from "@/lib/siteConfig";
import { usePublicLanguage } from "./PublicHeaderNav";

type Kind = "privacy" | "terms" | "cookies" | "company" | "accessibility" | "data-processing";
type Section = { title: string; body: React.ReactNode };

function identity(config: PublicSiteConfig, fi: boolean) {
  return `${config.legalName || config.serviceName}${config.businessId ? ` · ${fi ? "Y-tunnus" : "Business ID"} ${config.businessId}` : ""}`;
}

function pageData(kind: Kind, config: PublicSiteConfig, fi: boolean): { eyebrow: string; title: string; intro: React.ReactNode; sections: Section[] } {
  const controller = identity(config, fi);
  const contact = config.privacyEmail || config.email || (fi ? "sivustolla ilmoitettu yhteysosoite" : "the contact address shown on this website");
  if (kind === "company") return fi ? {
    eyebrow: "YRITYSTIEDOT", title: "Palveluntarjoajan tiedot", intro: <>Tällä sivulla kerrotaan verkkosivustopalvelun tarjoajan tunniste- ja yhteystiedot. Täydennä kaikki puuttuvat tiedot ennen kaupallista käyttöä.</>, sections: [
      { title: "Palveluntarjoaja", body: <><p><strong>Markkinointinimi:</strong> {config.serviceName}</p><p><strong>Virallinen nimi:</strong> {config.legalName || "Ei vielä määritetty"}</p><p><strong>Y-tunnus:</strong> {config.businessId || "Ei vielä määritetty"}</p><p><strong>ALV-tunniste:</strong> {config.vatId || "Ei määritetty / ei sovellu"}</p><p><strong>Maa:</strong> {config.country}</p></> },
      { title: "Yhteystiedot", body: <><p>{config.address || "Käyntiosoite ei ole vielä määritetty"}</p><p>{config.postalAddress || "Postiosoite ei ole vielä määritetty"}</p><p>{config.email || "Sähköpostiosoite ei ole vielä määritetty"}</p><p>{config.phone || "Puhelinnumeroa ei ole ilmoitettu"}</p></> },
      { title: "Palvelun luonne", body: <p>Palvelu on tarkoitettu ensisijaisesti yrityksille ja yhteisöille. Julkinen laskuri antaa vain suuntaa-antavan arvion. Tilaus syntyy vasta kirjallisella tarjouksella tai projektisopimuksella.</p> },
      { title: "Nimen käyttö", body: <p>{config.serviceName} on työskentelynimi. Yritysnimen, verkkotunnuksen ja mahdollisen tavaramerkin saatavuus on tarkistettava ja tarvittaessa rekisteröitävä ennen kaupallista käyttöönottoa.</p> },
    ]
  } : {
    eyebrow: "COMPANY INFORMATION", title: "Service-provider details", intro: <>This page identifies the provider of the website service. Complete all missing details before commercial use.</>, sections: [
      { title: "Service provider", body: <><p><strong>Trading name:</strong> {config.serviceName}</p><p><strong>Legal name:</strong> {config.legalName || "Not configured"}</p><p><strong>Business ID:</strong> {config.businessId || "Not configured"}</p><p><strong>VAT ID:</strong> {config.vatId || "Not configured / not applicable"}</p><p><strong>Country:</strong> {config.country}</p></> },
      { title: "Contact details", body: <><p>{config.address || "Street address not configured"}</p><p>{config.postalAddress || "Postal address not configured"}</p><p>{config.email || "Email not configured"}</p><p>{config.phone || "No telephone number published"}</p></> },
      { title: "Nature of the service", body: <p>The service is intended mainly for businesses and organisations. The public calculator is indicative only. An order is formed only through a written proposal or project agreement.</p> },
      { title: "Use of the name", body: <p>{config.serviceName} is a working name. Availability of the company name, domain and any trademark must be checked and, where appropriate, registered before commercial launch.</p> },
    ]
  };

  if (kind === "cookies") return fi ? {
    eyebrow: "EVÄSTEKÄYTÄNTÖ", title: "Evästeet ja vastaavat tekniikat", intro: <>Perussivusto pyritään toteuttamaan ilman mainonta- tai seurantakeksejä. Välttämättömiä teknisiä tietoja voidaan käyttää turvallisuuden ja lomakkeiden toiminnan vuoksi.</>, sections: [
      { title: "Välttämättömät toiminnot", body: <p>Istuntoevästettä käytetään vain yksityisen hallintapaneelin kirjautumiseen. Julkinen asiakas ei tarvitse käyttäjätiliä eikä kirjautumista. Lomakkeissa voidaan käyttää teknistä väärinkäytön estoa, aikaleimaa ja Cloudflare Turnstile -tarkistusta.</p> },
      { title: "Analytiikka", body: <p>Ei-välttämätöntä analytiikkaa ei tule ottaa käyttöön ennen kuin palveluntarjoaja on arvioinut suostumustarpeen, päivittänyt tämän selosteen ja lisännyt tarvittavan suostumushallinnan. Palvelinlokit voivat sisältää rajattuja teknisiä tietoja turvallisuutta ja virheiden selvitystä varten.</p> },
      { title: "Kolmannen osapuolen sisältö", body: <p>Julkisille sivuille ei tule ladata markkinointi-, kartta-, video- tai muuta upotettua sisältöä ilman arviota siitä, asettaako se evästeitä tai siirtääkö se tietoja ennen käyttäjän valintaa.</p> },
      { title: "Valintojen hallinta", body: <p>Jos ei-välttämättömiä tekniikoita otetaan käyttöön, käyttäjälle annetaan mahdollisuus hyväksyä tai hylätä ne yhtä helposti ja muuttaa valintaansa myöhemmin.</p> },
    ]
  } : {
    eyebrow: "COOKIE NOTICE", title: "Cookies and similar technologies", intro: <>The public site is designed to work without advertising or tracking cookies. Essential technical data may be used for security and form operation.</>, sections: [
      { title: "Essential functions", body: <p>A session cookie is used only for the private administrator dashboard. Public clients do not need an account or login. Forms may use abuse-prevention data, a timestamp and an optional Cloudflare Turnstile check.</p> },
      { title: "Analytics", body: <p>Non-essential analytics should not be enabled until the provider has assessed consent requirements, updated this notice and added appropriate consent controls. Server logs may contain limited technical data for security and troubleshooting.</p> },
      { title: "Third-party content", body: <p>Marketing, map, video or other embedded content should not be loaded on public pages before assessing whether it sets cookies or transfers data before the visitor makes a choice.</p> },
      { title: "Managing choices", body: <p>If non-essential technologies are introduced, visitors must be able to accept or reject them with equal ease and change their choice later.</p> },
    ]
  };

  if (kind === "accessibility") return fi ? {
    eyebrow: "SAAVUTETTAVUUS", title: "Saavutettavuusseloste", intro: <>Tavoitteena on selkeä, näppäimistöllä käytettävä ja mobiiliystävällinen palvelu. Tätä selostetta päivitetään havaittujen puutteiden ja palvelumuutosten yhteydessä.</>, sections: [
      { title: "Tavoitetaso", body: <p>Julkisissa sivuissa tavoitellaan WCAG 2.2 AA -tasoa siltä osin kuin se soveltuu palveluun. Käyttöliittymässä pyritään selkeisiin otsikoihin, lomakekenttien nimiin, riittävään kontrastiin, näkyviin kohdistuksiin ja kohtuulliseen suurennettavuuteen.</p> },
      { title: "Tunnetut rajoitteet", body: <p>Interaktiivinen hintalaskuri, mahdollinen roskapostintorjunta ja kolmansien osapuolten sisällöt voivat sisältää puutteita. Yksityinen hallintapaneeli on palveluntarjoajan työväline eikä asiakkaan kirjautumispalvelu.</p> },
      { title: "Palaute", body: <p>Jos et pysty käyttämään jotakin toimintoa, lähetä kuvaus osoitteeseen {contact}. Pyydettäessä olennainen sisältö tai yhteydenottotapa pyritään tarjoamaan saavutettavassa vaihtoehtoisessa muodossa.</p> },
      { title: "Arviointi", body: <p>Seloste perustuu palveluntarjoajan omaan arvioon ja teknisiin testeihin. Ulkopuolinen saavutettavuusauditointi voidaan hankkia erikseen.</p> },
    ]
  } : {
    eyebrow: "ACCESSIBILITY", title: "Accessibility statement", intro: <>The aim is a clear, keyboard-usable and mobile-friendly service. This statement is updated when limitations or service changes are identified.</>, sections: [
      { title: "Target", body: <p>Public pages aim for WCAG 2.2 Level AA where applicable. The interface aims to provide clear headings, labelled form fields, sufficient contrast, visible focus and reasonable zoom support.</p> },
      { title: "Known limitations", body: <p>The interactive estimate, optional anti-spam service and third-party content may contain limitations. The private dashboard is the provider's work tool and is not a customer-login service.</p> },
      { title: "Feedback", body: <p>If a function is inaccessible, describe the problem to {contact}. On request, essential content or an alternative contact method will be provided in an accessible form where reasonably possible.</p> },
      { title: "Assessment", body: <p>This statement is based on the provider's self-assessment and technical testing. An independent accessibility audit can be commissioned separately.</p> },
    ]
  };

  if (kind === "data-processing") return fi ? {
    eyebrow: "TIETOJENKÄSITTELY", title: "Tietojenkäsittelysopimuksen periaatteet", intro: <>Kun asiakas käyttää sivustoa henkilötietojen keräämiseen ja palveluntarjoaja käsittelee niitä asiakkaan puolesta, projektissa tarvitaan erillinen tietojenkäsittelysopimus. Tämä sivu kuvaa vähimmäissisällön, ei korvaa allekirjoitettua sopimusta.</>, sections: [
      { title: "Roolit ja ohjeet", body: <p>Asiakas toimii rekisterinpitäjänä oman toimintansa tiedoille. Palveluntarjoaja käsittelee tietoja vain kirjallisten ohjeiden, sovitun käyttötarkoituksen ja voimassa olevan sopimuksen mukaisesti.</p> },
      { title: "Käsittelyn kohde", body: <p>Sopimuksessa luetellaan tietoryhmät, rekisteröityjen ryhmät, käsittelyn tarkoitus, kesto, järjestelmät, säilytysajat ja poistomenettely.</p> },
      { title: "Turvallisuus", body: <p>Sovittavia toimia ovat vähintään käyttöoikeuksien rajaus, vahva tunnistautuminen, salaisuuksien hallinta, salatut yhteydet, lokitus, päivitykset, varmuuskopiot tarpeen mukaan ja henkilötietojen minimointi.</p> },
      { title: "Alihankkijat ja siirrot", body: <p>Vercel, Neon, sähköposti-, viesti-, analytiikka-, tekoäly- tai muut palvelut yksilöidään alikäsittelijöinä silloin, kun ne käsittelevät asiakkaan henkilötietoja. Muutoksista, siirroista ja suojatoimista sovitaan kirjallisesti.</p> },
      { title: "Tietoturvaloukkaukset", body: <p>Palveluntarjoaja ilmoittaa asiakkaalle havaitsemastaan henkilötietoihin vaikuttavasta loukkauksesta ilman aiheetonta viivytystä ja toimittaa saatavilla olevat tiedot vaikutusten, ilmoitusten ja korjaustoimien arviointiin.</p> },
      { title: "Avustaminen ja päättäminen", body: <p>Sopimus määrittää avun rekisteröityjen pyyntöihin, vaikutustenarviointeihin ja viranomaisasioihin sekä tietojen palauttamisen tai poistamisen palvelun päättyessä, ellei laki edellytä säilyttämistä.</p> },
    ]
  } : {
    eyebrow: "DATA PROCESSING", title: "Data-processing agreement principles", intro: <>When a client's website collects personal data and the provider processes it for the client, the project requires a separate data-processing agreement. This page describes minimum content and does not replace a signed agreement.</>, sections: [
      { title: "Roles and instructions", body: <p>The client is the controller for its operational data. The provider processes data only under documented instructions, the agreed purpose and the current agreement.</p> },
      { title: "Subject matter", body: <p>The agreement lists data categories, groups of data subjects, purpose, duration, systems, retention periods and deletion procedure.</p> },
      { title: "Security", body: <p>Agreed measures include access control, strong authentication, secret management, encrypted connections, logging, updates, proportionate backups and data minimisation.</p> },
      { title: "Subprocessors and transfers", body: <p>Vercel, Neon, email, messaging, analytics, AI and other services are identified as subprocessors where they process client personal data. Changes, transfers and safeguards are documented.</p> },
      { title: "Personal-data breaches", body: <p>The provider informs the client without undue delay of a detected breach affecting personal data and provides available information needed to assess effects, notifications and remedial measures.</p> },
      { title: "Assistance and termination", body: <p>The agreement defines assistance with data-subject requests, impact assessments and authorities, and the return or deletion of data when the service ends unless law requires retention.</p> },
    ]
  };

  if (kind === "privacy") return fi ? {
    eyebrow: "TIETOSUOJASELOSTE", title: "Henkilötietojen käsittely", intro: <>Tämä seloste koskee {config.serviceName} -sivustoa, tarjouspyyntöjä, asiakastukea, potentiaalisten yritysasiakkaiden yhteystietoja ja projektinhallintaa.</>, sections: [
      { title: "1. Rekisterinpitäjä", body: <p>{controller}. Osoite: {config.postalAddress || config.address || "täydennettävä ennen käyttöönottoa"}. Tietosuojayhteys: {contact}.</p> },
      { title: "2. Käsiteltävät tiedot", body: <p>Nimi, työrooli, yritys, sähköposti, puhelin, verkkosivusto, lomakevalinnat, viestit, tarjoukset, sopimus- ja laskutustiedot, projektipyynnöt, projektihistoria sekä väärinkäytön torjuntaan tarvittavat rajatut tekniset tiedot. Yritysprospektoinnissa voidaan tallentaa julkisista yrityssivuista, hakemistoista ja yhteystietosivuista löytyviä työyhteystietoja sekä tiedon lähde.</p> },
      { title: "3. Käyttötarkoitukset ja oikeusperuste", body: <><p>Tietoja käytetään yhteydenottoihin vastaamiseen, pyydettyihin toimiin ennen sopimusta, projektin ja asiakassuhteen hoitamiseen, laskutukseen, tuen tarjoamiseen, palvelun turvallisuuteen ja oikeusvaateisiin.</p><p>Perusteena on tilanteen mukaan sopimus tai sopimusta edeltävät toimet, lakisääteinen velvoite, oikeutettu etu harjoittaa B2B-myyntiä ja suojata palvelua tai erikseen pyydetty suostumus. Sähköinen suoramarkkinointi arvioidaan vastaanottajan roolin ja soveltuvan lain perusteella, ja viesteissä tarjotaan kielto-oikeus.</p></> },
      { title: "4. Lähteet", body: <p>Tiedot saadaan henkilöltä tai hänen yritykseltään, projektin aikana syntyvistä tapahtumista sekä yrityksen julkisista verkkosivuista, hakukoneista, yrityshakemistoista ja sosiaalisen median yritysprofiileista. Arkaluonteisia tietoja ei pyydetä julkisissa lomakkeissa.</p> },
      { title: "5. Vastaanottajat ja palveluntarjoajat", body: <p>Tietoja voivat käsitellä vain tarpeelliset palvelut, kuten Vercel (sovellus ja julkaisu), Neon (tietokanta), valittu sähköposti- ja viestipalvelu, Google/Gmail, Resend, Twilio, Browserless, Cloudflare sekä Anthropic vain silloin, kun valinnainen Claude-toiminto on käytössä. Palveluntarjoajat ja sopimukset tarkistetaan tuotantoon vietäessä.</p> },
      { title: "6. Siirrot ETA:n ulkopuolelle", body: <p>Osa pilvipalveluista voi käsitellä tietoja ETA:n ulkopuolella. Tällöin käytetään soveltuvaa siirtoperustetta, kuten riittävyyspäätöstä tai vakiosopimuslausekkeita, ja arvioidaan tarvittavat lisäsuojat.</p> },
      { title: "7. Säilytys", body: <p>Vastaamattomat tai toteutumattomat tarjouspyynnöt poistetaan yleensä 24 kuukauden kuluessa viimeisestä merkityksellisestä yhteydestä. Asiakasprojektien tiedot säilytetään sopimuksen ajan ja yleensä enintään 36 kuukautta sen jälkeen tukien, siirtojen ja oikeusvaateiden vuoksi. Kirjanpitoaineisto säilytetään lain edellyttämän ajan. Tukipyynnöt ja lokit poistetaan, kun niitä ei enää tarvita.</p> },
      { title: "8. Tekoäly", body: <p>Claude on valinnainen luonnosteluapu hallintapaneelissa. Ydinpalvelut toimivat ilman sitä. Tekoälylle ei tule lähettää tarpeettomia henkilötietoja, arkaluonteisia tietoja tai salaisuuksia. Tulokset tarkistaa ihminen, eikä tekoäly tee asiakasta koskevia automaattisia päätöksiä.</p> },
      { title: "9. Suojaaminen", body: <p>Pääsy on rajattu ylläpitäjälle, istunnot suojataan, salaisuudet pidetään palvelinympäristössä, yhteydet salataan, järjestelmät päivitetään ja tapahtumia kirjataan tarpeen mukaan. Mikään järjestelmä ei ole täysin riskitön.</p> },
      { title: "10. Oikeudet", body: <p>Voit pyytää pääsyä, oikaisua, poistamista, käsittelyn rajoittamista tai vastustaa oikeutettuun etuun perustuvaa käsittelyä. Voit peruuttaa suostumuksen tulevaa käsittelyä varten. Sinulla on oikeus tehdä valitus Suomen tietosuojavaltuutetun toimistolle. Pyyntö lähetetään osoitteeseen {contact}; henkilöllisyys voidaan joutua varmistamaan.</p> },
    ]
  } : {
    eyebrow: "PRIVACY NOTICE", title: "Processing of personal data", intro: <>This notice covers the {config.serviceName} website, enquiries, client support, prospective-business contacts and project management.</>, sections: [
      { title: "1. Controller", body: <p>{controller}. Address: {config.postalAddress || config.address || "to be completed before launch"}. Privacy contact: {contact}.</p> },
      { title: "2. Data processed", body: <p>Name, professional role, company, email, telephone, website, form selections, messages, proposals, contract and billing data, project requests, project history and limited technical anti-abuse data. For business prospecting, publicly available professional contact details and their source may be stored.</p> },
      { title: "3. Purposes and legal basis", body: <><p>Data is used to answer enquiries, take requested pre-contract steps, manage projects and client relationships, invoice, provide support, secure the service and establish legal claims.</p><p>The basis is, depending on context, contract or pre-contract steps, legal obligation, legitimate interests in B2B sales and service security, or separately requested consent. Electronic direct marketing is assessed according to the recipient's role and applicable law, and messages provide an opt-out.</p></> },
      { title: "4. Sources", body: <p>Data comes from the person or business, project events, public company websites, search services, business directories and business social-media profiles. Public forms do not request sensitive personal data.</p> },
      { title: "5. Recipients and providers", body: <p>Data may be processed only by necessary services such as Vercel (application and deployment), Neon (database), the selected email and messaging provider, Google/Gmail, Resend, Twilio, Browserless, Cloudflare and Anthropic only when the optional Claude feature is used. Providers and agreements must be reviewed at production launch.</p> },
      { title: "6. Transfers outside the EEA", body: <p>Some cloud providers may process data outside the EEA. An appropriate transfer mechanism, such as an adequacy decision or standard contractual clauses, and any necessary supplementary safeguards must then be used.</p> },
      { title: "7. Retention", body: <p>Unsuccessful enquiries are normally removed within 24 months of the last meaningful contact. Client-project records are kept for the contract period and normally no longer than 36 months afterwards for support, transfer and legal claims. Accounting material is retained for the period required by law. Support records and logs are removed when no longer needed.</p> },
      { title: "8. Artificial intelligence", body: <p>Claude is an optional drafting aid in the administrator dashboard. Core services work without it. Unnecessary personal data, sensitive data and secrets must not be sent to the AI service. A human reviews outputs and AI does not make automated decisions about clients.</p> },
      { title: "9. Security", body: <p>Access is limited to administrators, sessions are protected, secrets remain server-side, connections are encrypted, systems are updated and relevant events are logged. No system is completely risk-free.</p> },
      { title: "10. Rights", body: <p>You may request access, correction, deletion or restriction, or object to processing based on legitimate interests. Consent can be withdrawn for future processing. You may complain to the Office of the Data Protection Ombudsman in Finland. Send requests to {contact}; identity may need to be verified.</p> },
    ]
  };

  return fi ? {
    eyebrow: "YLEISET PALVELUEHDOT", title: "Yritysasiakkaiden verkkosivustopalvelun ehdot", intro: <>Nämä yleiset ehdot koskevat {config.serviceName} -palvelua yrityksille ja yhteisöille. Projektikohtainen kirjallinen tarjous, palvelukuvaus, tietojenkäsittelysopimus ja muut allekirjoitetut ehdot ovat ensisijaisia.</>, sections: [
      { title: "1. Tarjoukset ja sopimuksen synty", body: <p>Julkinen laskuri, verkkosivun hinnat ja keskustelut ovat suuntaa-antavia eivätkä muodosta tilausta. Sitova sopimus syntyy vasta, kun osapuolet hyväksyvät kirjallisen tarjouksen tai projektisopimuksen. Tarjouksessa määritetään osapuolet, työn sisältö, hinta, ALV, aikataulu ja voimassaolo.</p> },
      { title: "2. Työn sisältö ja muutokset", body: <p>Toimitus sisältää vain kirjallisesti luetellut sivut, kielet, ominaisuudet, integraatiot, sisältötyön ja korjauskierrokset. Lisätyö, uudet toiminnot ja olennaiset muutokset käsitellään muutosvärityksenä, jolle vahvistetaan vaikutus hintaan ja aikatauluun ennen toteutusta.</p> },
      { title: "3. Asiakkaan vastuut", body: <p>Asiakas antaa oikeat yritys- ja yhteystiedot, lailliset tekstit ja kuvat, tarvittavat käyttöoikeudet sekä päätökset sovitussa ajassa. Asiakas vastaa oman toimintansa väitteistä, tuotteista, tietosuojasta, kuluttajatiedoista ja luvista. Asiakkaan viive siirtää aikataulua.</p> },
      { title: "4. Hinta, ALV ja maksut", body: <p>Hinnat ilmoitetaan tarjouksessa ilman ALV:tä tai ALV:n kanssa selkeästi merkittynä. Sovellettava ALV lisätään, jos palveluntarjoaja on ALV-rekisterissä. Maksuerät, ennakko, eräpäivä, viivästyskorko ja perintäkulut määritetään tarjouksessa ja laskulla. Asiakas ei saa pidättää riidatonta maksua.</p> },
      { title: "5. Ulkopuoliset palvelut", body: <p>Verkkotunnus, Vercel, Neon, sähköposti, analytiikka, ajanvaraus, maksupalvelut, SMS, tekoäly ja muut ulkopuoliset palvelut laskutetaan erikseen, ellei tarjouksessa toisin sanota. Asiakas hyväksyy niiden omat ehdot. Palveluntarjoaja ei vastaa niiden hinnanmuutoksista tai häiriöistä, mutta auttaa sovitun ylläpidon rajoissa.</p> },
      { title: "6. Omistus, käyttöoikeudet ja tilit", body: <p>Suositus on, että asiakas omistaa verkkotunnuksen ja tuotantotilit. Asiakkaan toimittama aineisto säilyy asiakkaan omistuksessa. Projektikohtainen sopimus määrittää lähdekoodin siirron, käyttöoikeuden ja mahdolliset uudelleenkäytettävät komponentit. Omistus tai laaja käyttöoikeus siirtyy vasta sovittujen maksujen jälkeen. Kolmansien osapuolten komponentteihin sovelletaan niiden lisenssejä.</p> },
      { title: "7. Hyväksyntä ja virheiden korjaus", body: <p>Asiakkaalle annetaan kohtuullinen tarkastusaika ennen julkaisua tai luovutusta. Ilmoitetut sovitusta poikkeavat virheet korjataan kohtuullisessa ajassa. Uudet toiveet, sisältömuutokset, selain- tai palvelumuutokset ja kolmannen osapuolen viat eivät ole takuukorjauksia.</p> },
      { title: "8. Ylläpito ja palvelutaso", body: <p>Ylläpito sisältää vain valitun paketin tehtävät ja vasteajat. Ellei kirjallisesti sovita, 24/7-valvontaa, keskeytymätöntä saatavuutta tai tiettyä korjausaikaa ei luvata. Suunnitelluista huolloista ilmoitetaan kohtuullisesti. Varmuuskopioiden laajuus ja palautus testataan sovitulla tavalla.</p> },
      { title: "9. Tietosuoja ja luottamuksellisuus", body: <p>Osapuolet suojaavat toiselta saamansa ei-julkiset tiedot ja käyttävät niitä vain sopimuksen toteuttamiseen. Jos palveluntarjoaja käsittelee henkilötietoja asiakkaan puolesta, allekirjoitetaan tarvittaessa erillinen tietojenkäsittelysopimus.</p> },
      { title: "10. Tekoäly", body: <p>Tekoälyä voidaan käyttää luonnosteluun, tiivistämiseen ja tekniseen apuun vain sovitulla tavalla. Lopputulos tarkistetaan ihmisen toimesta. Asiakkaan salaisia tai arkaluonteisia tietoja ei syötetä tekoälypalveluun ilman kirjallista hyväksyntää ja asianmukaisia sopimuksia.</p> },
      { title: "11. Vastuu", body: <p>Palveluntarjoaja vastaa välittömistä vahingoista, jotka johtuvat sopimusrikkomuksesta, enintään kyseisestä projektista viimeisen 12 kuukauden aikana maksettuun määrään, ellei pakottava laki tai tahallisuus taikka törkeä huolimattomuus edellytä muuta. Välillisiä vahinkoja, liikevaihdon menetystä, hakusijoitusta tai ulkopuolisen palvelun häiriötä ei korvata. Rajoitukset eivät koske vastuuta, jota ei lain mukaan voi rajoittaa.</p> },
      { title: "12. Keskeytys ja päättäminen", body: <p>Työ voidaan keskeyttää olennaisen maksuviiveen, turvallisuusriskin tai lainvastaisen käytön vuoksi kohtuullisen ilmoituksen jälkeen. Päättämisessä maksetaan tehty työ ja sitovat kulut. Sopimus määrittää aineiston, tilien ja tietojen hallitun luovutuksen sekä poistamisen.</p> },
      { title: "13. Ylivoimainen este", body: <p>Osapuoli ei vastaa kohtuullisen vaikutusvaltansa ulkopuolisesta esteestä, kuten laajasta verkkohäiriöstä, viranomaispäätöksestä tai alihankkijan poikkeuksellisesta häiriöstä. Velvoitteita jatketaan, kun este lakkaa.</p> },
      { title: "14. Laki ja erimielisyydet", body: <p>Sopimukseen sovelletaan Suomen lakia. Erimielisyydet pyritään ratkaisemaan ensin neuvottelulla. Ellei projektisopimuksessa toisin sovita, asia käsitellään toimivaltaisessa tuomioistuimessa: {config.court}.</p> },
    ]
  } : {
    eyebrow: "GENERAL SERVICE TERMS", title: "B2B website-service terms", intro: <>These general terms apply to {config.serviceName} services for businesses and organisations. A project-specific written proposal, service description, data-processing agreement and other signed terms take priority.</>, sections: [
      { title: "1. Proposals and contract formation", body: <p>The public calculator, website prices and discussions are indicative and do not create an order. A binding contract arises only when both parties accept a written proposal or project agreement. It identifies the parties, scope, price, VAT, timetable and validity.</p> },
      { title: "2. Scope and changes", body: <p>Delivery includes only the pages, languages, features, integrations, content work and revision rounds listed in writing. Additional work, new features and material changes follow written change control, including price and schedule effects before implementation.</p> },
      { title: "3. Client responsibilities", body: <p>The client supplies accurate business information, lawful text and images, required access and decisions on time. The client is responsible for its business claims, products, privacy duties, consumer information and permits. Client delay moves the schedule.</p> },
      { title: "4. Price, VAT and payment", body: <p>The proposal clearly states whether prices exclude or include VAT. Applicable VAT is added where the provider is VAT-registered. Instalments, deposit, due dates, statutory late interest and collection costs are stated in the proposal and invoice. Undisputed amounts may not be withheld.</p> },
      { title: "5. Third-party services", body: <p>Domain, Vercel, Neon, email, analytics, booking, payment services, SMS, AI and other third-party charges are separate unless the proposal expressly includes them. The client accepts provider terms. The studio is not responsible for their price changes or outages, but assists within the agreed maintenance scope.</p> },
      { title: "6. Ownership, licences and accounts", body: <p>The recommended arrangement is that the client owns the domain and production accounts. Client material remains client-owned. The project agreement defines source transfer, licences and reusable components. Ownership or a broad licence transfers only after agreed payment. Third-party components retain their licences.</p> },
      { title: "7. Acceptance and defect correction", body: <p>The client receives a reasonable review period before launch or handoff. Reported deviations from the agreed specification are corrected within a reasonable time. New requests, content changes, browser or provider changes and third-party faults are not warranty corrections.</p> },
      { title: "8. Maintenance and service level", body: <p>Maintenance includes only the selected plan's tasks and response targets. Unless expressly agreed, no 24/7 monitoring, uninterrupted availability or fixed restoration time is promised. Planned maintenance is communicated reasonably. Backup scope and restoration testing are agreed separately.</p> },
      { title: "9. Privacy and confidentiality", body: <p>Each party protects non-public information received from the other and uses it only to perform the agreement. Where the provider processes personal data for the client, a separate data-processing agreement is signed where required.</p> },
      { title: "10. Artificial intelligence", body: <p>AI may assist drafting, summarisation and technical work only as agreed. A human reviews deliverables. Client secrets or sensitive data are not sent to an AI service without written approval and suitable contractual safeguards.</p> },
      { title: "11. Liability", body: <p>The provider's liability for direct loss caused by breach is limited to the amount paid for the affected project during the preceding 12 months, unless mandatory law, intent or gross negligence requires otherwise. Indirect loss, lost turnover, search ranking and third-party outages are excluded. Nothing limits liability that cannot lawfully be limited.</p> },
      { title: "12. Suspension and termination", body: <p>Work may be suspended after reasonable notice for material non-payment, security risk or unlawful use. On termination, completed work and committed costs are paid. The agreement defines orderly handoff of materials, accounts and data and subsequent deletion.</p> },
      { title: "13. Force majeure", body: <p>A party is not responsible for an obstacle beyond reasonable control, including widespread network failure, government action or exceptional provider failure. Performance resumes when the obstacle ends.</p> },
      { title: "14. Law and disputes", body: <p>Finnish law applies. Disputes are first addressed through negotiation. Unless the project agreement says otherwise, the competent court is: {config.court}.</p> },
    ]
  };
}

export default function LegalPageClient({ kind, config }: { kind: Kind; config: PublicSiteConfig }) {
  const language = usePublicLanguage();
  const fi = language === "fi";
  const data = pageData(kind, config, fi);
  const sectionIds = data.sections.map((section, index) => `section-${index + 1}`);
  return <div className="legal-layout">
    <aside className="legal-sidebar">
      <p className="eyebrow">{fi ? "SIVUN SISÄLTÖ" : "ON THIS PAGE"}</p>
      <nav aria-label={fi ? "Sivun sisältö" : "Page contents"}>{data.sections.map((section, index) => <a href={`#${sectionIds[index]}`} key={section.title}>{section.title.replace(/^\d+\.\s*/, "")}</a>)}</nav>
      <div className="legal-contact-card"><strong>{config.serviceName}</strong><span>{config.legalName || (fi ? "Virallinen nimi puuttuu" : "Legal name not configured")}</span>{config.businessId && <span>{fi ? "Y-tunnus" : "Business ID"} {config.businessId}</span>}{config.email && <a href={`mailto:${config.email}`}>{config.email}</a>}</div>
    </aside>
    <article className="legal-page stack">
      <header className="legal-hero"><p className="eyebrow">{data.eyebrow}</p><h1>{data.title}</h1><p className="legal-updated">{fi ? "Päivitetty 13.7.2026" : "Last updated July 13, 2026"}</p><div className="legal-intro">{data.intro}</div></header>
      {!config.legalReady && <div className="admin-legal-warning"><strong>{fi ? "Ei valmis kaupalliseen julkaisuun" : "Not ready for commercial publication"}</strong><p>{fi ? "Virallinen nimi, Y-tunnus, osoite tai julkinen sähköposti puuttuu ympäristömuuttujista." : "The legal name, Business ID, address or public email is missing from environment variables."}</p></div>}
      <div className="legal-sections">{data.sections.map((section, index) => <section id={sectionIds[index]} key={section.title}><span className="legal-section-number">{String(index + 1).padStart(2, "0")}</span><h2>{section.title}</h2>{section.body}</section>)}</div>
      <div className="legal-links"><a className="public-secondary" href="/">{fi ? "Takaisin etusivulle" : "Back to the website"}</a><a href="/company">{fi ? "Yritystiedot" : "Company"}</a><a href="/privacy">{fi ? "Tietosuoja" : "Privacy"}</a><a href="/cookies">{fi ? "Evästeet" : "Cookies"}</a><a href="/terms">{fi ? "Palveluehdot" : "Service terms"}</a><a href="/data-processing">{fi ? "Tietojenkäsittely" : "Data processing"}</a></div>
      <p className="legal-disclaimer">{fi ? "Nämä sivut ovat tuotantoon valmisteltavia sopimus- ja tietosuojamalleja, eivät yksilöllistä oikeudellista neuvontaa. Täydennä ne todellisilla yritystiedoilla, palveluprosessilla ja palveluntarjoajilla sekä tarkistuta ne ennen kaupallista käyttöä." : "These pages are production-oriented contract and privacy templates, not individual legal advice. Complete them with the actual entity, service process and providers and have them reviewed before commercial use."}</p>
    </article>
  </div>;
}
