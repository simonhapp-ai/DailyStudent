import { useNavigate } from 'react-router-dom'
import { Header } from '../components/ui/Header'

export function AGBScreen() {
  const navigate = useNavigate()

  return (
    <div className="flex flex-col min-h-screen bg-background pb-28">
      <Header title="Nutzungsbedingungen" subtitle="Terms and Conditions" onBack={() => navigate(-1)} />

      <div className="px-4 mt-4 space-y-6 text-[13px] text-text-secondary leading-relaxed">

        {/* Meta */}
        <div className="bg-surface border border-border/60 rounded-[20px] p-4 shadow-card-adaptive">
          <p className="text-[11px] text-text-muted uppercase font-semibold tracking-wide mb-1">Letzte Aktualisierung</p>
          <p className="text-text-primary font-semibold">14. Juni 2026</p>
        </div>

        {/* Agreement */}
        <Section title="AGREEMENT TO OUR LEGAL TERMS">
          <p>We are <strong>Simon Happ Social Media</strong>, a company registered in Germany at Henners Hof 13, Seevetal, 21217.</p>
          <p className="mt-2">We operate the website <strong>dailystudent.de</strong> and the mobile application <strong>DailyStudent</strong>, as well as any other related products and services that refer or link to these legal terms (collectively, the "Services").</p>
          <p className="mt-2">You can contact us by phone at <strong>017635629220</strong>, email at <strong>simonhapp161@gmail.com</strong>, or by mail to Henners Hof 13, Seevetal, 21217, Germany.</p>
          <p className="mt-2">These Legal Terms constitute a legally binding agreement made between you ("you") and Simon Happ Social Media, concerning your access to and use of the Services. You agree that by accessing the Services, you have read, understood, and agreed to be bound by all of these Legal Terms. IF YOU DO NOT AGREE WITH ALL OF THESE LEGAL TERMS, THEN YOU ARE EXPRESSLY PROHIBITED FROM USING THE SERVICES AND YOU MUST DISCONTINUE USE IMMEDIATELY.</p>
          <p className="mt-2">We will provide you with prior notice of any scheduled changes to the Services you are using. The modified Legal Terms will become effective upon posting or notifying you by <strong>updates@dailystudent.de</strong>. By continuing to use the Services after the effective date of any changes, you agree to be bound by the modified terms.</p>
          <p className="mt-2">All users who are minors in the jurisdiction in which they reside (generally under the age of 18) must have the permission of, and be directly supervised by, their parent or guardian to use the Services.</p>
        </Section>

        {/* 1 */}
        <Section title="1. OUR SERVICES">
          <p>The information provided when using the Services is not intended for distribution to or use by any person or entity in any jurisdiction or country where such distribution or use would be contrary to law or regulation or which would subject us to any registration requirement within such jurisdiction or country. Accordingly, those persons who choose to access the Services from other locations do so on their own initiative and are solely responsible for compliance with local laws, if and to the extent local laws are applicable.</p>
        </Section>

        {/* 2 */}
        <Section title="2. INTELLECTUAL PROPERTY RIGHTS">
          <SubHeading>Our intellectual property</SubHeading>
          <p>We are the owner or the licensee of all intellectual property rights in our Services, including all source code, databases, functionality, software, website designs, audio, video, text, photographs, and graphics in the Services (collectively, the "Content"), as well as the trademarks, service marks, and logos contained therein (the "Marks").</p>
          <p className="mt-2">Our Content and Marks are protected by copyright and trademark laws and treaties around the world.</p>
          <p className="mt-2">The Content and Marks are provided in or through the Services "AS IS" for your personal, non-commercial use only.</p>
          <SubHeading>Your use of our Services</SubHeading>
          <p>Subject to your compliance with these Legal Terms, we grant you a non-exclusive, non-transferable, revocable licence to access the Services and download or print a copy of any portion of the Content to which you have properly gained access, solely for your personal, non-commercial use.</p>
          <p className="mt-2">Except as set out in this section, no part of the Services and no Content or Marks may be copied, reproduced, aggregated, republished, uploaded, posted, publicly displayed, encoded, translated, transmitted, distributed, sold, licensed, or otherwise exploited for any commercial purpose whatsoever, without our express prior written permission.</p>
          <SubHeading>Your submissions and contributions</SubHeading>
          <p><strong>Submissions:</strong> By directly sending us any question, comment, suggestion, idea, feedback, or other information about the Services, you agree to assign to us all intellectual property rights in such Submission. You agree that we shall own this Submission and be entitled to its unrestricted use and dissemination for any lawful purpose.</p>
          <p className="mt-2"><strong>You are responsible for what you post or upload:</strong> By sending us Submissions and/or posting Contributions through any part of the Services, you confirm that you have read and agree with our Prohibited Activities and will not post, send, publish, upload, or transmit through the Services any content that is illegal, harassing, hateful, harmful, defamatory, obscene, abusive, discriminatory, threatening, sexually explicit, false, inaccurate, deceitful, or misleading.</p>
          <p className="mt-2"><strong>We may remove or edit your Content:</strong> Although we have no obligation to monitor any Contributions, we shall have the right to remove or edit any Contributions at any time without notice if in our reasonable opinion we consider such Contributions harmful or in breach of these Legal Terms.</p>
        </Section>

        {/* 3 */}
        <Section title="3. USER REPRESENTATIONS">
          <p>By using the Services, you represent and warrant that: (1) all registration information you submit will be true, accurate, current, and complete; (2) you will maintain the accuracy of such information and promptly update such registration information as necessary; (3) you have the legal capacity and you agree to comply with these Legal Terms; (4) you are not a minor in the jurisdiction in which you reside, or if a minor, you have received parental permission to use the Services; (5) you will not access the Services through automated or non-human means, whether through a bot, script or otherwise; (6) you will not use the Services for any illegal or unauthorised purpose; and (7) your use of the Services will not violate any applicable law or regulation.</p>
          <p className="mt-2">If you provide any information that is untrue, inaccurate, not current, or incomplete, we have the right to suspend or terminate your account and refuse any and all current or future use of the Services (or any portion thereof).</p>
        </Section>

        {/* 4 */}
        <Section title="4. USER REGISTRATION">
          <p>You may be required to register with the Services. You agree to keep your password confidential and will be responsible for all use of your account and password. We reserve the right to remove, reclaim, or change a username you select if we determine, in our sole discretion, that such username is inappropriate, obscene, or otherwise objectionable.</p>
        </Section>

        {/* 5 */}
        <Section title="5. PURCHASES AND PAYMENT">
          <p>We accept the following forms of payment: Visa, Mastercard, and other payment methods offered through Stripe.</p>
          <p className="mt-2">You agree to provide current, complete, and accurate purchase and account information for all purchases made via the Services. You further agree to promptly update account and payment information, including email address, payment method, and payment card expiration date, so that we can complete your transactions and contact you as needed. Sales tax will be added to the price of purchases as deemed required by us. We may change prices at any time.</p>
          <p className="mt-2">You agree to pay all charges at the prices then in effect for your purchases, and you authorise us to charge your chosen payment provider for any such amounts upon placing your order. We reserve the right to correct any errors or mistakes in pricing, even if we have already requested or received payment.</p>
        </Section>

        {/* 6 */}
        <Section title="6. SUBSCRIPTIONS">
          <SubHeading>Billing and Renewal</SubHeading>
          <p>Your subscription will continue and automatically renew unless cancelled. You consent to our charging your payment method on a recurring basis without requiring your prior approval for each recurring charge, until such time as you cancel the applicable order. The length of your billing cycle is monthly or annually, depending on the subscription plan you choose.</p>
          <SubHeading>Free Trial</SubHeading>
          <p>We may offer a free trial to new users of the Services. The length of the free trial period will be as specified during sign-up. We have the right to limit your ability to take advantage of multiple free trials.</p>
          <SubHeading>Cancellation</SubHeading>
          <p>All purchases are non-refundable. You can cancel your subscription at any time by logging into your account. Your cancellation will take effect at the end of the current paid term. If you have any questions or are unsatisfied with our Services, please email us at simonhapp161@gmail.com.</p>
          <SubHeading>Fee Changes</SubHeading>
          <p>We may, from time to time, make changes to the subscription fee and will communicate any price changes to you in accordance with applicable law.</p>
        </Section>

        {/* 7 */}
        <Section title="7. SOFTWARE">
          <p>We may include software for use in connection with our Services. If such software is accompanied by an end user licence agreement ("EULA"), the terms of the EULA will govern your use of the software. If such software is not accompanied by a EULA, then we grant to you a non-exclusive, revocable, personal, and non-transferable licence to use such software solely in connection with our services and in accordance with these Legal Terms.</p>
        </Section>

        {/* 8 */}
        <Section title="8. PROHIBITED ACTIVITIES">
          <p>You may not access or use the Services for any purpose other than that for which we make the Services available. The Services may not be used in connection with any commercial endeavours except those that are specifically endorsed or approved by us.</p>
          <p className="mt-2">As a user of the Services, you agree not to:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Systematically retrieve data or other content from the Services to create or compile, directly or indirectly, a collection, compilation, database, or directory without written permission from us.</li>
            <li>Trick, defraud, or mislead us and other users, especially in any attempt to learn sensitive account information such as user passwords.</li>
            <li>Circumvent, disable, or otherwise interfere with security-related features of the Services.</li>
            <li>Disparage, tarnish, or otherwise harm, in our opinion, us and/or the Services.</li>
            <li>Use any information obtained from the Services in order to harass, abuse, or harm another person.</li>
            <li>Make improper use of our support services or submit false reports of abuse or misconduct.</li>
            <li>Use the Services in a manner inconsistent with any applicable laws or regulations.</li>
            <li>Engage in unauthorised framing of or linking to the Services.</li>
            <li>Upload or transmit (or attempt to upload or to transmit) viruses, Trojan horses, or other material that interferes with any party's uninterrupted use and enjoyment of the Services.</li>
            <li>Engage in any automated use of the system, such as using scripts to send comments or messages, or using any data mining, robots, or similar data gathering and extraction tools.</li>
            <li>Delete the copyright or other proprietary rights notice from any Content.</li>
            <li>Attempt to impersonate another user or person or use the username of another user.</li>
            <li>Harass, annoy, intimidate, or threaten any of our employees or agents engaged in providing any portion of the Services to you.</li>
            <li>Attempt to bypass any measures of the Services designed to prevent or restrict access to the Services, or any portion of the Services.</li>
            <li>Copy or adapt the Services' software, including but not limited to Flash, PHP, HTML, JavaScript, or other code.</li>
            <li>Use the Services as part of any effort to compete with us or otherwise use the Services and/or the Content for any revenue-generating endeavour or commercial enterprise.</li>
          </ul>
        </Section>

        {/* 9 */}
        <Section title="9. USER GENERATED CONTRIBUTIONS">
          <p>The Services may invite you to chat, contribute to, or participate in blogs, message boards, online forums, and other functionality, and may provide you with the opportunity to create, submit, post, display, transmit, perform, publish, distribute, or broadcast content and materials to us or on the Services.</p>
          <p className="mt-2">Any Contributions you transmit may be treated as non-confidential and non-proprietary. When you create or make available any Contributions, you thereby represent and warrant that your Contributions do not violate any applicable laws or infringe the rights of any third party.</p>
        </Section>

        {/* 10 */}
        <Section title="10. CONTRIBUTION LICENCE">
          <p>By posting your Contributions to any part of the Services, you automatically grant, and you represent and warrant that you have the right to grant, to us an unrestricted, unlimited, irrevocable, perpetual, non-exclusive, transferable, royalty-free, fully-paid, worldwide right, and licence to host, use, copy, reproduce, disclose, sell, resell, publish, broadcast, retitle, archive, store, cache, publicly perform, publicly display, reformat, translate, transmit, excerpt (in whole or in part), and distribute such Contributions for any purpose, commercial, advertising, or otherwise.</p>
          <p className="mt-2">We do not assert any ownership over your Contributions. You retain full ownership of all of your Contributions and any intellectual property rights or other proprietary rights associated with your Contributions. We are not liable for any statements or representations in your Contributions provided by you in any area on the Services.</p>
        </Section>

        {/* 11 */}
        <Section title="11. GUIDELINES FOR REVIEWS">
          <p>We may provide you areas on the Services to leave reviews or ratings. When posting a review, you must comply with the following criteria: (1) you should have firsthand experience with the person/entity being reviewed; (2) your reviews should not contain offensive profanity, or abusive, racist, offensive, or hateful language; (3) your reviews should not contain discriminatory references based on religion, race, gender, national origin, age, marital status, sexual orientation, or disability; (4) your reviews should not contain references to illegal activity; (5) you should not be affiliated with competitors if posting negative reviews; (6) you should not make any conclusions as to the legality of conduct; (7) you may not post any false or misleading statements; and (8) you may not organise a campaign encouraging others to post reviews, whether positive or negative.</p>
        </Section>

        {/* 12 */}
        <Section title="12. MOBILE APPLICATION LICENCE">
          <SubHeading>Use Licence</SubHeading>
          <p>If you access the Services via the App, then we grant you a revocable, non-exclusive, non-transferable, limited right to install and use the App on wireless electronic devices owned or controlled by you, and to access and use the App on such devices strictly in accordance with the terms and conditions of this mobile application licence contained in these Legal Terms.</p>
          <SubHeading>Apple and Google Terms</SubHeading>
          <p>The following terms apply when you use the App obtained from either the Apple Store or Google Play (each an "App Distributor") to access the Services: (1) the licence granted to you for our App is limited to a non-transferable licence to use the application on a device that utilises the Apple iOS or Android operating systems, as applicable, and in accordance with the usage rules set forth in the applicable App Distributor's terms of service; (2) we are responsible for providing any maintenance and support services with respect to the App as specified in the terms and conditions of this mobile application licence contained in these Legal Terms or as otherwise required under applicable law, and you acknowledge that each App Distributor has no obligation whatsoever to furnish any maintenance and support services with respect to the App.</p>
        </Section>

        {/* 13 */}
        <Section title="13. SOCIAL MEDIA">
          <p>As part of the functionality of the Services, you may link your account with online accounts you have with third-party service providers (each such account, a "Third-Party Account") by either: (1) providing your Third-Party Account login information through the Services; or (2) allowing us to access your Third-Party Account, as is permitted under the applicable terms and conditions that govern your use of each Third-Party Account.</p>
        </Section>

        {/* 14 */}
        <Section title="14. ADVERTISERS">
          <p>We allow advertisers to display their advertisements and other information in certain areas of the Services, such as sidebar advertisements or banner advertisements. We simply provide the space to place such advertisements, and we have no other relationship with advertisers.</p>
        </Section>

        {/* 15 */}
        <Section title="15. SERVICES MANAGEMENT">
          <p>We reserve the right, but not the obligation, to: (1) monitor the Services for violations of these Legal Terms; (2) take appropriate legal action against anyone who, in our sole discretion, violates the law or these Legal Terms, including without limitation, reporting such user to law enforcement authorities; (3) in our sole discretion and without limitation, refuse, restrict access to, limit the availability of, or disable (to the extent technologically feasible) any of your Contributions or any portion thereof; (4) in our sole discretion and without limitation, notice, or liability, to remove from the Services or otherwise disable all files and content that are excessive in size or are in any way burdensome to our systems; and (5) otherwise manage the Services in a manner designed to protect our rights and property and to facilitate the proper functioning of the Services.</p>
        </Section>

        {/* 16 */}
        <Section title="16. PRIVACY POLICY">
          <p>We care about data privacy and security. By using the Services, you agree to be bound by our Privacy Policy, which is accessible within the app under Profile → Datenschutzerklärung. Please be advised the Services are hosted in Germany. If you access the Services from any other region of the world with laws or other requirements governing personal data collection, use, or disclosure that differ from applicable laws in Germany, then through your continued use of the Services, you are transferring your data to Germany, and you expressly consent to have your data transferred to and processed in Germany.</p>
        </Section>

        {/* 17 */}
        <Section title="17. TERM AND TERMINATION">
          <p>These Legal Terms shall remain in full force and effect while you use the Services. WITHOUT LIMITING ANY OTHER PROVISION OF THESE LEGAL TERMS, WE RESERVE THE RIGHT TO, IN OUR SOLE DISCRETION AND WITHOUT NOTICE OR LIABILITY, DENY ACCESS TO AND USE OF THE SERVICES (INCLUDING BLOCKING CERTAIN IP ADDRESSES), TO ANY PERSON FOR ANY REASON OR FOR NO REASON, INCLUDING WITHOUT LIMITATION FOR BREACH OF ANY REPRESENTATION, WARRANTY, OR COVENANT CONTAINED IN THESE LEGAL TERMS OR OF ANY APPLICABLE LAW OR REGULATION.</p>
          <p className="mt-2">If we terminate or suspend your account for any reason, you are prohibited from registering and creating a new account under your name, a fake or borrowed name, or the name of any third party, even if you may be acting on behalf of the third party. In addition to terminating or suspending your account, we reserve the right to take appropriate legal action, including without limitation pursuing civil, criminal, and injunctive redress.</p>
        </Section>

        {/* 18 */}
        <Section title="18. MODIFICATIONS AND INTERRUPTIONS">
          <p>We reserve the right to change, modify, or remove the contents of the Services at any time or for any reason at our sole discretion without notice. However, we have no obligation to update any information on our Services. We will not be liable to you or any third party for any modification, price change, suspension, or discontinuance of the Services.</p>
          <p className="mt-2">We cannot guarantee the Services will be available at all times. We may experience hardware, software, or other problems or need to perform maintenance related to the Services, resulting in interruptions, delays, or errors. We reserve the right to change, revise, update, suspend, discontinue, or otherwise modify the Services at any time or for any reason without notice to you.</p>
        </Section>

        {/* 19 */}
        <Section title="19. GOVERNING LAW">
          <p>These Legal Terms are governed by and interpreted following the laws of Germany, and the use of the United Nations Convention of Contracts for the International Sales of Goods is expressly excluded. If your habitual residence is in the EU, and you are a consumer, you additionally possess the protection provided to you by obligatory provisions of the law of your country of residence. Simon Happ Social Media and yourself both agree to submit to the non-exclusive jurisdiction of the courts of Germany, which means that you may make a claim to defend your consumer protection rights in regards to these Legal Terms in Germany, or in the EU country in which you reside.</p>
        </Section>

        {/* 20 */}
        <Section title="20. DISPUTE RESOLUTION">
          <SubHeading>Informal Negotiations</SubHeading>
          <p>To expedite resolution and control the cost of any dispute, controversy, or claim related to these Legal Terms (each a "Dispute" and collectively, the "Disputes") brought by either you or us (individually, a "Party" and collectively, the "Parties"), the Parties agree to first attempt to negotiate any Dispute informally for at least thirty (30) days before initiating any legal proceedings. Such informal negotiations commence upon written notice from one Party to the other Party. Please contact us at <strong>simonhapp161@gmail.com</strong> to resolve any concerns.</p>
        </Section>

        {/* 21 */}
        <Section title="21. CORRECTIONS">
          <p>There may be information on the Services that contains typographical errors, inaccuracies, or omissions, including descriptions, pricing, availability, and various other information. We reserve the right to correct any errors, inaccuracies, or omissions and to change or update the information on the Services at any time, without prior notice.</p>
        </Section>

        {/* 22 */}
        <Section title="22. DISCLAIMER">
          <p>THE SERVICES ARE PROVIDED ON AN AS-IS AND AS-AVAILABLE BASIS. YOU AGREE THAT YOUR USE OF THE SERVICES WILL BE AT YOUR SOLE RISK. TO THE FULLEST EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, IN CONNECTION WITH THE SERVICES AND YOUR USE THEREOF, INCLUDING, WITHOUT LIMITATION, THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE MAKE NO WARRANTIES OR REPRESENTATIONS ABOUT THE ACCURACY OR COMPLETENESS OF THE SERVICES' CONTENT OR THE CONTENT OF ANY WEBSITES OR MOBILE APPLICATIONS LINKED TO THE SERVICES AND WE WILL ASSUME NO LIABILITY OR RESPONSIBILITY FOR ANY (1) ERRORS, MISTAKES, OR INACCURACIES OF CONTENT AND MATERIALS, (2) PERSONAL INJURY OR PROPERTY DAMAGE, OF ANY NATURE WHATSOEVER, RESULTING FROM YOUR ACCESS TO AND USE OF THE SERVICES, (3) ANY UNAUTHORISED ACCESS TO OR USE OF OUR SECURE SERVERS AND/OR ANY AND ALL PERSONAL INFORMATION AND/OR FINANCIAL INFORMATION STORED THEREIN.</p>
        </Section>

        {/* 22a */}
        <Section title="22a. HAFTUNGSAUSSCHLUSS FÜR KI-GENERIERTE INHALTE">
          <p><strong>KI-generierte Inhalte sind keine Garantie für schulischen Erfolg.</strong> DailyStudent nutzt KI-Technologien (u.&nbsp;a. Groq, Google Gemini) zur Generierung von Lernmaterialien wie Zusammenfassungen, Karteikarten, Lernzetteln, Probeklausuren und Lernplänen. Diese Inhalte werden automatisiert erzeugt und können inhaltliche Fehler, Ungenauigkeiten oder veraltete Informationen enthalten.</p>
          <p className="mt-2"><strong>Keine Haftung für Noten oder Prüfungsergebnisse.</strong> Wir übernehmen ausdrücklich <strong>keine Haftung</strong> für schulische Noten, Prüfungsergebnisse oder sonstige Leistungsbeurteilungen, die im Zusammenhang mit der Nutzung von DailyStudent entstehen. Die KI-generierten Materialien ersetzen nicht den Unterricht, die Beratung durch Lehrkräfte oder eigenes kritisches Denken.</p>
          <p className="mt-2"><strong>Eigenverantwortung des Nutzers.</strong> Du bist selbst dafür verantwortlich, KI-generierte Inhalte zu prüfen, mit verlässlichen Quellen abzugleichen und eigenständig zu beurteilen. Insbesondere bei fachspezifischen Themen wie Mathematik, Naturwissenschaften oder Fremdsprachen können die KI-Antworten von den gültigen Lehrplaninhalten abweichen.</p>
          <p className="mt-2"><strong>Kein Ersatz für professionellen Rat.</strong> DailyStudent ist ein Lernhilfsmittel und kein zertifiziertes Bildungsprodukt. Für verbindliche Aussagen zu Lehrplaninhalten wende dich an deine Schule oder zuständige Bildungsbehörde.</p>
        </Section>

        {/* 23 */}
        <Section title="23. LIMITATIONS OF LIABILITY">
          <p>IN NO EVENT WILL WE OR OUR DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE TO YOU OR ANY THIRD PARTY FOR ANY DIRECT, INDIRECT, CONSEQUENTIAL, EXEMPLARY, INCIDENTAL, SPECIAL, OR PUNITIVE DAMAGES, INCLUDING LOST PROFIT, LOST REVENUE, LOSS OF DATA, OR OTHER DAMAGES ARISING FROM YOUR USE OF THE SERVICES, EVEN IF WE HAVE BEEN ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</p>
        </Section>

        {/* 24 */}
        <Section title="24. INDEMNIFICATION">
          <p>You agree to defend, indemnify, and hold us harmless, including our subsidiaries, affiliates, and all of our respective officers, agents, partners, and employees, from and against any loss, damage, liability, claim, or demand, including reasonable attorneys' fees and expenses, made by any third party due to or arising out of: (1) your Contributions; (2) use of the Services; (3) breach of these Legal Terms; (4) any breach of your representations and warranties set forth in these Legal Terms; (5) your violation of the rights of a third party, including but not limited to intellectual property rights; or (6) any overt harmful act toward any other user of the Services with whom you connected via the Services.</p>
        </Section>

        {/* 25 */}
        <Section title="25. USER DATA">
          <p>We will maintain certain data that you transmit to the Services for the purpose of managing the performance of the Services, as well as data relating to your use of the Services. Although we perform regular routine backups of data, you are solely responsible for all data that you transmit or that relates to any activity you have undertaken using the Services. You agree that we shall have no liability to you for any loss or corruption of any such data, and you hereby waive any right of action against us arising from any such loss or corruption of such data.</p>
        </Section>

        {/* 26 */}
        <Section title="26. ELECTRONIC COMMUNICATIONS, TRANSACTIONS, AND SIGNATURES">
          <p>Visiting the Services, sending us emails, and completing online forms constitute electronic communications. You consent to receive electronic communications, and you agree that all agreements, notices, disclosures, and other communications we provide to you electronically, via email and on the Services, satisfy any legal requirement that such communication be in writing. YOU HEREBY AGREE TO THE USE OF ELECTRONIC SIGNATURES, CONTRACTS, ORDERS, AND OTHER RECORDS, AND TO ELECTRONIC DELIVERY OF NOTICES, POLICIES, AND RECORDS OF TRANSACTIONS INITIATED OR COMPLETED BY US OR VIA THE SERVICES.</p>
        </Section>

        {/* 27 */}
        <Section title="27. MISCELLANEOUS">
          <p>These Legal Terms and any policies or operating rules posted by us on the Services or in respect to the Services constitute the entire agreement and understanding between you and us. Our failure to exercise or enforce any right or provision of these Legal Terms shall not operate as a waiver of such right or provision. These Legal Terms operate to the fullest extent permissible by law. We may assign any or all of our rights and obligations to others at any time. We shall not be responsible or liable for any loss, damage, delay, or failure to act caused by any cause beyond our reasonable control. If any provision or part of a provision of these Legal Terms is determined to be unlawful, void, or unenforceable, that provision or part of the provision is deemed severable from these Legal Terms and does not affect the validity and enforceability of any remaining provisions.</p>
        </Section>

        {/* 28 */}
        <Section title="28. CONTACT US">
          <p>In order to resolve a complaint regarding the Services or to receive further information regarding use of the Services, please contact us at:</p>
          <div className="mt-3 space-y-1">
            <p><strong>Simon Happ Social Media</strong></p>
            <p>Henners Hof 13</p>
            <p>Seevetal, 21217</p>
            <p>Germany</p>
            <p className="mt-2">Phone: <strong>017635629220</strong></p>
            <p>Email: <strong>simonhapp161@gmail.com</strong></p>
          </div>
        </Section>

      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border/60 rounded-[20px] p-5 shadow-card-adaptive">
      <p className="text-[13px] font-bold text-text-primary mb-3">{title}</p>
      <div className="text-[13px] text-text-secondary leading-relaxed">{children}</div>
    </div>
  )
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-semibold text-text-primary mt-3 mb-1">{children}</p>
}
