import type { DocSpec } from "./pdf";

/**
 * A realistic-but-fictional CDSCO clinical-trial site package for Protocol
 * NX-2025-07. It is deliberately incomplete so a readiness check lands on
 * "not ready" with credible, India-specific gaps:
 *
 *   Present  : CDSCO permission, EC approval/registration/composition,
 *              protocol, investigator's brochure, PI CV + registration,
 *              GCP training, investigator's undertaking.
 *   Partial  : informed consent (English only, local-language pending),
 *              insurance (draft policy, no policy number issued).
 *   Missing  : CTRI registration, SEC recommendation, import licence,
 *              audio-visual consent SOP, injury/death compensation procedure.
 *
 * All names, numbers, and dates are invented for the demo.
 */
export const cdscoDemoPackage: DocSpec[] = [
  {
    fileName: "CDSCO Permission Letter (Form CT-06).pdf",
    title: "CDSCO - Permission to Conduct Clinical Trial (Form CT-06)",
    pages: [
      {
        heading: "Grant of Permission to Conduct Clinical Trial",
        body: [
          "Central Drugs Standard Control Organisation (CDSCO), Directorate General of Health Services, Ministry of Health and Family Welfare, Government of India.",
          "Permission No. CT-06/NX-2025-07 dated 14 March 2025. This permission is granted in Form CT-06 by the Central Licensing Authority pursuant to the application made in Form CT-04, under the New Drugs and Clinical Trials Rules, 2019.",
          "Sponsor: NexTrial Sciences Pvt. Ltd. Investigational product: NX-114 (an investigational new drug). Protocol No. NX-2025-07, version 2.0.",
          "Permission is hereby granted to conduct the clinical trial at the approved investigator sites in accordance with the approved protocol, the said Rules, and Good Clinical Practice. The permission is subject to registration of the trial and continued ethics committee oversight.",
        ],
      },
    ],
  },
  {
    fileName: "Ethics Committee Approval and Registration.pdf",
    title: "Ethics Committee - Approval, Registration and Composition",
    pages: [
      {
        heading: "Ethics Committee Approval Letter",
        body: [
          "Aarogya Institutional Ethics Committee. Ref: IEC/NX-2025-07/041 dated 2 April 2025.",
          "The Ethics Committee, at its meeting held on 28 March 2025, reviewed and approved Protocol No. NX-2025-07 (version 2.0) and the informed consent document (English, version 2.0) for the clinical trial of NX-114.",
          "Approval is granted for a period of one year, subject to annual review and reporting of serious adverse events. Signed by the Chairperson and Member Secretary of the Ethics Committee.",
        ],
      },
      {
        heading: "Ethics Committee Registration (Form CT-02)",
        body: [
          "The Aarogya Institutional Ethics Committee is registered with the Central Drugs Standard Control Organisation / Department of Health Research under the New Drugs and Clinical Trials Rules, 2019.",
          "Registration No.: ECR/AIEC/Inst/KA/2019/1187. Registration granted in Form CT-02. Valid from 11 June 2019 to 10 June 2024, renewed to 10 June 2029.",
          "The registration certifies that the committee's composition and standard operating procedures comply with the requirements of the said Rules.",
        ],
      },
      {
        heading: "Ethics Committee Composition",
        body: [
          "The Ethics Committee comprises the following members, meeting the composition requirements under the Rules:",
          "1. Chairperson (external, non-affiliated). 2. Basic medical scientist (pharmacologist). 3. Two clinicians. 4. Legal expert. 5. Social scientist / philosopher. 6. Lay person from the community. 7. Member Secretary.",
          "The committee has at least seven members, with adequate representation of medical and non-medical, and male and female members.",
        ],
      },
    ],
  },
  {
    fileName: "Clinical Trial Protocol.pdf",
    title: "Clinical Trial Protocol NX-2025-07",
    pages: [
      {
        heading: "Protocol Summary",
        body: [
          "Protocol Title: A randomised, double-blind, placebo-controlled study to evaluate the efficacy and safety of NX-114 in adults. Protocol No. NX-2025-07. Version 2.0, dated 20 February 2025.",
          "Sponsor: NexTrial Sciences Pvt. Ltd. Phase: II. Objective: to assess the efficacy and safety of NX-114 versus placebo over 12 weeks.",
          "This protocol has been approved by the Ethics Committee and forms the basis of the trial conduct at all participating sites.",
        ],
      },
      {
        heading: "Study Design and Endpoints",
        body: [
          "Design: multicentre, randomised (1:1), double-blind, placebo-controlled, parallel-group. Planned sample size: 180 subjects.",
          "Primary endpoint: change from baseline in the primary efficacy score at week 12. Secondary endpoints: responder rate, safety and tolerability, and quality-of-life measures.",
          "Statistical analysis: intention-to-treat population, with the primary endpoint analysed using a mixed model for repeated measures.",
        ],
      },
    ],
  },
  {
    fileName: "Investigator Brochure.pdf",
    title: "Investigator's Brochure - NX-114",
    pages: [
      {
        heading: "Investigator's Brochure",
        body: [
          "Investigational product: NX-114. Investigator's Brochure, edition 3.0, dated January 2025.",
          "This brochure summarises the physical, chemical and pharmaceutical properties, and the nonclinical pharmacology, pharmacokinetics and toxicology of NX-114 relevant to its study in human subjects.",
          "Nonclinical studies indicate an acceptable safety margin at the proposed clinical doses. No genotoxic signal was observed in the standard battery of tests.",
        ],
      },
      {
        heading: "Clinical Experience and Safety Summary",
        body: [
          "In the completed first-in-human study, NX-114 was generally well tolerated. The most frequently reported adverse events were mild headache and transient nausea.",
          "No serious adverse reactions attributable to NX-114 have been reported to date. Investigators should remain vigilant for the risks described in the safety reference information.",
        ],
      },
    ],
  },
  {
    fileName: "Investigator Site File.pdf",
    title: "Investigator Site File - Principal Investigator",
    pages: [
      {
        heading: "Principal Investigator - CV and Medical Registration",
        body: [
          "Principal Investigator: Dr A. Sharma, MBBS, MD (Medicine). Current curriculum vitae signed and dated 3 January 2025.",
          "Medical registration: registered with the State Medical Council, registration number KMC/2009/44219, current and in good standing.",
          "The investigator has relevant experience in the conduct of clinical trials and in the therapeutic area under study.",
        ],
      },
      {
        heading: "Good Clinical Practice (GCP) Training Certificate",
        body: [
          "This certifies that Dr A. Sharma has successfully completed training in ICH Good Clinical Practice (GCP), consistent with the Indian GCP guidelines.",
          "Certificate issued 15 January 2025, valid for two years. Training covered the principles of GCP, informed consent, safety reporting, and the responsibilities of the investigator.",
        ],
      },
      {
        heading: "Investigator's Undertaking",
        body: [
          "I, the undersigned Principal Investigator, undertake to conduct the clinical trial of NX-114 (Protocol NX-2025-07) in accordance with the approved protocol, the principles of Good Clinical Practice, and the New Drugs and Clinical Trials Rules, 2019.",
          "I undertake to obtain informed consent from each subject, to report serious adverse events within the required timelines, and to permit monitoring and audit. Signed by the Principal Investigator, dated 5 April 2025.",
        ],
      },
    ],
  },
  {
    fileName: "Informed Consent Form (English).pdf",
    title: "Informed Consent Form - English (version 2.0)",
    pages: [
      {
        heading: "Informed Consent Form (English)",
        body: [
          "Study: A study of NX-114 in adults (Protocol NX-2025-07). Informed Consent Form, English version 2.0, dated 18 February 2025.",
          "You are being invited to take part in a research study. Participation is entirely voluntary and you may withdraw at any time without any effect on your usual medical care.",
          "This section explains the purpose of the study, the procedures involved, the possible risks and benefits, confidentiality, and your rights as a participant.",
          "Note: This is the English-language version of the informed consent document. The local/regional-language (Hindi) translation for subjects who do not read English is to be attached and is not included in this file.",
        ],
      },
    ],
  },
  {
    fileName: "Clinical Trial Insurance Policy (Draft).pdf",
    title: "Clinical Trial Insurance Policy - DRAFT",
    pages: [
      {
        heading: "Clinical Trial Insurance - Draft Policy",
        body: [
          "DRAFT - NOT YET ISSUED. Proposed clinical trial insurance for Protocol NX-2025-07 (NX-114), sponsor NexTrial Sciences Pvt. Ltd.",
          "Insurer: Sentinel General Insurance Co. The policy is intended to insure the subjects enrolled in the trial against trial-related injury, in accordance with the New Drugs and Clinical Trials Rules, 2019.",
          "Policy Number: [to be allotted on issuance]. Period of insurance: to commence on the date of issuance. Sum insured and schedule of subjects: to be finalised.",
          "This draft is provided for review. The executed policy and certificate of insurance have not yet been issued.",
        ],
      },
    ],
  },
];
