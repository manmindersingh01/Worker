import type { Blueprint } from "../types";

/**
 * India (CDSCO) clinical-trial site readiness blueprint.
 *
 * Encodes the essential-document expectations for conducting a new-drug
 * clinical trial in India under the New Drugs and Clinical Trials Rules, 2019
 * (NDCT Rules). The India-specific items - CTRI registration, EC registration
 * with CDSCO/DHR, an English + local-language ICF, audio-visual consent for
 * vulnerable subjects, trial insurance, and injury/death compensation - are the
 * ones a domain expert checks first, so they carry real weight here.
 *
 * Form numbers are only stated where confirmed against CDSCO's published rules
 * (Form CT-01/CT-02 for EC registration, Form CT-04/CT-06 for the trial
 * permission). Where a specific form is not confirmed, the item stays worded at
 * the document level rather than guessing a number.
 */
export const cdscoBlueprint: Blueprint = {
  id: "cdsco-ndct-2019",
  jurisdiction: "IN-CDSCO",
  jurisdictionLabel: "India - CDSCO",
  title: "India (CDSCO) clinical trial site readiness",
  version: "2019.1",
  authority: "New Drugs and Clinical Trials Rules, 2019 (CDSCO)",
  summary:
    "Essential documents required to run a new-drug clinical trial site in India under the NDCT Rules, 2019.",
  categories: [
    {
      key: "regulatory",
      title: "Regulatory approvals",
      description: "Central approvals required before a trial can begin.",
    },
    {
      key: "ethics",
      title: "Ethics Committee",
      description: "Independent ethics review and its standing with CDSCO.",
    },
    {
      key: "investigator",
      title: "Investigator & site",
      description: "The people and site conducting the trial are qualified.",
    },
    {
      key: "consent",
      title: "Informed consent",
      description: "How subjects understand and agree to participate.",
    },
    {
      key: "protection",
      title: "Subject protection",
      description: "India's strict insurance and compensation safeguards.",
    },
    {
      key: "core",
      title: "Core study documents",
      description: "The protocol and product dossier the trial runs on.",
    },
  ],
  items: [
    // ----------------------------- Regulatory ----------------------------
    {
      key: "cdsco-permission",
      title: "CDSCO permission to conduct the trial",
      category: "regulatory",
      weight: 5,
      reference: "NDCT Rules 2019 - Form CT-04 (application) / Form CT-06 (grant)",
      query:
        "CDSCO permission to conduct clinical trial Form CT-06 grant Central Licensing Authority DCGI approval letter",
      evidence:
        "A permission/approval letter from CDSCO (the Central Licensing Authority) granting permission to conduct this trial, ideally issued on Form CT-06.",
    },
    {
      key: "ctri-registration",
      title: "CTRI registration (before first enrolment)",
      category: "regulatory",
      weight: 4,
      indiaSpecific: true,
      reference: "Clinical Trials Registry-India - mandatory before enrolling the first subject",
      query:
        "Clinical Trials Registry India CTRI registration number trial registered before enrolment",
      evidence:
        "Proof the trial is registered with the Clinical Trials Registry-India (CTRI), showing a CTRI registration number and a date prior to first-subject enrolment.",
    },
    {
      key: "sec-review",
      title: "Subject Expert Committee (SEC) review",
      category: "regulatory",
      weight: 3,
      reference: "SEC recommendation in the CDSCO approval pathway",
      query:
        "Subject Expert Committee SEC recommendation minutes review of protocol approval recommendation",
      evidence:
        "The Subject Expert Committee's recommendation or minutes recommending approval of the protocol.",
    },
    {
      key: "import-license",
      title: "Import licence for the investigational product",
      category: "regulatory",
      weight: 2,
      conditional: true,
      reference: "Required when the investigational product is imported",
      query:
        "import licence permission investigational product test licence import of new drug for clinical trial",
      evidence:
        "An import licence/permission for the investigational product where it is manufactured outside India.",
      partialWhen:
        "If the product is manufactured domestically this may be not applicable; note that rather than failing it.",
    },
    // ------------------------------- Ethics ------------------------------
    {
      key: "ec-approval",
      title: "Ethics Committee approval letter",
      category: "ethics",
      weight: 5,
      reference: "NDCT Rules 2019, Chapter III",
      query:
        "Ethics Committee approval letter approved protocol informed consent version signed",
      evidence:
        "A signed Ethics Committee approval letter approving this specific protocol and consent version.",
    },
    {
      key: "ec-registration",
      title: "EC registration with CDSCO / DHR",
      category: "ethics",
      weight: 4,
      indiaSpecific: true,
      reference: "NDCT Rules 2019 - Form CT-01 (application) / Form CT-02 (registration, valid 5 years)",
      query:
        "Ethics Committee registration number CDSCO DHR Form CT-02 registered ethics committee validity",
      evidence:
        "Evidence the Ethics Committee is registered with CDSCO / the Department of Health Research, with a registration number and current validity (Form CT-02).",
    },
    {
      key: "ec-composition",
      title: "EC composition / membership",
      category: "ethics",
      weight: 2,
      reference: "NDCT Rules 2019, Third Schedule",
      query:
        "Ethics Committee composition members chairperson basic medical scientist legal lay person membership list",
      evidence:
        "A membership list showing the EC meets composition requirements (chairperson, medical and non-medical members, a legal expert, and a lay person, among others).",
    },
    // --------------------------- Investigator ----------------------------
    {
      key: "pi-registration-cv",
      title: "PI medical registration & CV",
      category: "investigator",
      weight: 3,
      query:
        "principal investigator curriculum vitae medical council registration number qualifications signed dated",
      evidence:
        "A current, signed CV for the principal investigator and evidence of valid medical council registration.",
    },
    {
      key: "gcp-training",
      title: "GCP training certificate",
      category: "investigator",
      weight: 2,
      query:
        "Good Clinical Practice GCP training certificate investigator site staff completion",
      evidence:
        "A Good Clinical Practice (GCP) training certificate for the investigator/site staff, ideally current.",
    },
    {
      key: "investigator-undertaking",
      title: "Investigator's undertaking",
      category: "investigator",
      weight: 2,
      reference: "NDCT Rules 2019 - investigator's undertaking",
      query:
        "investigator undertaking agreement signed responsibilities conduct trial per protocol GCP",
      evidence:
        "A signed investigator's undertaking/agreement to conduct the trial in line with the protocol and GCP.",
    },
    // ------------------------------ Consent ------------------------------
    {
      key: "icf-english-local",
      title: "ICF in English and local language",
      category: "consent",
      weight: 4,
      indiaSpecific: true,
      reference: "NDCT Rules 2019 - consent in a language the subject understands",
      query:
        "informed consent form English Hindi regional local language translation version",
      evidence:
        "Informed consent documents in English and in the local/regional language the subjects will actually understand.",
      partialWhen:
        "If only the English version is present and the local-language translation is missing, this is partial, not present.",
    },
    {
      key: "av-consent",
      title: "Audio-visual consent recording (vulnerable subjects)",
      category: "consent",
      weight: 3,
      indiaSpecific: true,
      reference:
        "NDCT Rules 2019 - AV recording of consent for vulnerable subjects (NCE/NME trials)",
      query:
        "audio visual recording informed consent process vulnerable subjects SOP procedure",
      evidence:
        "An SOP or documented provision for audio-visual recording of the consent process where required (vulnerable subjects, new chemical/molecular entity trials).",
    },
    // ------------------------- Subject protection ------------------------
    {
      key: "trial-insurance",
      title: "Clinical trial insurance policy",
      category: "protection",
      weight: 5,
      indiaSpecific: true,
      reference: "NDCT Rules 2019 - mandatory clinical trial insurance",
      query:
        "clinical trial insurance policy certificate coverage subjects injury indemnity insured",
      evidence:
        "A valid clinical trial insurance policy or certificate covering the trial subjects.",
      partialWhen:
        "A draft or expired policy, or one missing a policy number/validity, is partial rather than present.",
    },
    {
      key: "compensation-provision",
      title: "Compensation for trial-related injury/death",
      category: "protection",
      weight: 4,
      indiaSpecific: true,
      reference: "NDCT Rules 2019, Chapter VI (Rules 39-42)",
      query:
        "compensation trial related injury death provision financial free medical management procedure",
      evidence:
        "A documented provision or procedure for compensation and free medical management in the event of trial-related injury or death.",
    },
    // --------------------------- Core documents --------------------------
    {
      key: "protocol",
      title: "Approved clinical trial protocol",
      category: "core",
      weight: 4,
      query:
        "clinical trial protocol title objectives study design version number approved endpoints",
      evidence:
        "A versioned, approved clinical trial protocol for this study.",
    },
    {
      key: "investigator-brochure",
      title: "Investigator's Brochure",
      category: "core",
      weight: 2,
      query:
        "investigator brochure IB version safety pharmacology preclinical clinical data",
      evidence:
        "A current Investigator's Brochure (IB) for the investigational product.",
    },
  ],
};
