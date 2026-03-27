/**
 * Voice Commands Configuration
 *
 * Defines all voice commands with multilingual support (English, Hindi, Marathi).
 * Commands are matched using keyword-based matching for flexibility.
 */

/**
 * Navigation commands - routes to different sections
 */
export const NAVIGATION_COMMANDS = [
  // Home / Main Page
  {
    id: 'home',
    action: 'navigate',
    route: '/',
    keywords: {
      en: ['home', 'main page', 'go home', 'back to home', 'main menu', 'start', 'beginning'],
      hi: ['होम', 'मुख्य पेज', 'घर', 'शुरुआत', 'मुख्य मेनू', 'होम पेज'],
      mr: ['होम', 'मुख्य पान', 'घर', 'सुरुवात', 'मुख्य मेनू'],
    },
    feedback: {
      en: 'Going to home page',
      hi: 'होम पेज पर जा रहे हैं',
      mr: 'मुख्य पानावर जात आहे',
    },
  },
  // Electricity Department
  {
    id: 'electricity',
    action: 'navigate',
    route: '/electricity',
    keywords: {
      en: ['electricity', 'electric', 'power', 'bijli', 'light', 'electricity department', 'power section', 'open electricity'],
      hi: ['बिजली', 'इलेक्ट्रिसिटी', 'विद्युत', 'बिजली विभाग', 'बिजली खोलो', 'बिजली सेक्शन', 'पावर'],
      mr: ['वीज', 'इलेक्ट्रिसिटी', 'वीज विभाग', 'वीज उघडा', 'वीज सेक्शन', 'लाइट'],
    },
    feedback: {
      en: 'Opening electricity services',
      hi: 'बिजली सेवाएं खोल रहे हैं',
      mr: 'वीज सेवा उघडत आहे',
    },
  },
  // Water Department
  {
    id: 'water',
    action: 'navigate',
    route: '/water',
    keywords: {
      en: ['water', 'water department', 'water section', 'open water', 'water services', 'paani'],
      hi: ['पानी', 'जल', 'वॉटर', 'पानी विभाग', 'पानी खोलो', 'जल विभाग', 'पानी सेक्शन'],
      mr: ['पाणी', 'जल', 'वॉटर', 'पाणी विभाग', 'पाणी उघडा', 'जल विभाग'],
    },
    feedback: {
      en: 'Opening water services',
      hi: 'पानी सेवाएं खोल रहे हैं',
      mr: 'पाणी सेवा उघडत आहे',
    },
  },
  // Gas Department
  {
    id: 'gas',
    action: 'navigate',
    route: '/gas',
    keywords: {
      en: ['gas', 'lpg', 'cooking gas', 'gas department', 'open gas', 'gas section', 'cylinder'],
      hi: ['गैस', 'एलपीजी', 'रसोई गैस', 'गैस विभाग', 'गैस खोलो', 'सिलेंडर'],
      mr: ['गॅस', 'एलपीजी', 'स्वयंपाक गॅस', 'गॅस विभाग', 'गॅस उघडा', 'सिलेंडर'],
    },
    feedback: {
      en: 'Opening gas services',
      hi: 'गैस सेवाएं खोल रहे हैं',
      mr: 'गॅस सेवा उघडत आहे',
    },
  },
  // Municipal Services
  {
    id: 'municipal',
    action: 'navigate',
    route: '/municipal',
    keywords: {
      en: ['municipal', 'municipality', 'corporation', 'nagar palika', 'nagarpalika', 'open municipal', 'city services', 'civic'],
      hi: ['नगरपालिका', 'नगर पालिका', 'म्युनिसिपल', 'कॉर्पोरेशन', 'नगर निगम', 'म्युनिसिपल खोलो', 'नगरपालिका सेवाएं'],
      mr: ['नगरपालिका', 'म्युनिसिपल', 'महानगरपालिका', 'नगर पालिका', 'नगरपालिका उघडा', 'नागरी सेवा'],
    },
    feedback: {
      en: 'Opening municipal services',
      hi: 'नगरपालिका सेवाएं खोल रहे हैं',
      mr: 'नगरपालिका सेवा उघडत आहे',
    },
  },
];

/**
 * Service-specific commands - opens specific forms/dialogs within departments
 */
export const SERVICE_COMMANDS = [
  // === ELECTRICITY SERVICES ===
  {
    id: 'electricity_billing',
    action: 'openService',
    department: 'electricity',
    serviceId: 'billing',
    keywords: {
      en: ['pay electricity bill', 'electricity bill', 'pay bill', 'light bill', 'power bill', 'bijli bill', 'billing payments', 'pay electricity'],
      hi: ['बिजली का बिल', 'बिल भरो', 'बिजली बिल भरो', 'बिल भुगतान', 'लाइट बिल'],
      mr: ['वीज बिल', 'बिल भरा', 'वीज बिल भरा', 'बिल भरणा', 'लाइट बिल'],
    },
    feedback: {
      en: 'Opening electricity billing',
      hi: 'बिजली बिलिंग खोल रहे हैं',
      mr: 'वीज बिलिंग उघडत आहे',
    },
  },
  {
    id: 'electricity_new_connection',
    action: 'openService',
    department: 'electricity',
    serviceId: 'new_connections',
    keywords: {
      en: ['new electricity connection', 'new connection', 'apply connection', 'electricity connection', 'get connection', 'new power connection'],
      hi: ['नया कनेक्शन', 'बिजली कनेक्शन', 'नया बिजली कनेक्शन', 'कनेक्शन लो', 'नया कनेक्शन खोलो'],
      mr: ['नवीन कनेक्शन', 'वीज कनेक्शन', 'नवीन वीज कनेक्शन', 'कनेक्शन घ्या', 'नवीन कनेक्शन उघडा'],
    },
    feedback: {
      en: 'Opening new connection form',
      hi: 'नया कनेक्शन फॉर्म खोल रहे हैं',
      mr: 'नवीन कनेक्शन फॉर्म उघडत आहे',
    },
  },
  {
    id: 'electricity_track',
    action: 'openService',
    department: 'electricity',
    serviceId: 'track',
    keywords: {
      en: ['track electricity', 'track application', 'track complaint', 'check status', 'application status', 'complaint status'],
      hi: ['ट्रैक करो', 'स्थिति देखो', 'आवेदन स्थिति', 'शिकायत स्थिति', 'ट्रैक एप्लीकेशन'],
      mr: ['ट्रॅक करा', 'स्थिती पहा', 'अर्ज स्थिती', 'तक्रार स्थिती'],
    },
    feedback: {
      en: 'Opening tracking form',
      hi: 'ट्रैकिंग फॉर्म खोल रहे हैं',
      mr: 'ट्रॅकिंग फॉर्म उघडत आहे',
    },
  },
  {
    id: 'electricity_complaints',
    action: 'openService',
    department: 'electricity',
    serviceId: 'complaints',
    keywords: {
      en: ['electricity complaint', 'report outage', 'power cut', 'no electricity', 'light problem', 'register complaint', 'file complaint'],
      hi: ['बिजली शिकायत', 'बिजली गायब', 'लाइट नहीं', 'शिकायत करो', 'शिकायत दर्ज करो', 'बिजली समस्या'],
      mr: ['वीज तक्रार', 'वीज गेली', 'लाइट नाही', 'तक्रार करा', 'तक्रार नोंदवा', 'वीज समस्या'],
    },
    feedback: {
      en: 'Opening complaints form',
      hi: 'शिकायत फॉर्म खोल रहे हैं',
      mr: 'तक्रार फॉर्म उघडत आहे',
    },
  },
  {
    id: 'electricity_connection_mgmt',
    action: 'openService',
    department: 'electricity',
    serviceId: 'connection_mgmt',
    keywords: {
      en: ['connection management', 'load change', 'meter relocation', 'manage connection', 'modify connection'],
      hi: ['कनेक्शन प्रबंधन', 'लोड चेंज', 'मीटर बदलो', 'कनेक्शन मैनेज'],
      mr: ['कनेक्शन व्यवस्थापन', 'लोड बदला', 'मीटर बदला', 'कनेक्शन व्यवस्थापित करा'],
    },
    feedback: {
      en: 'Opening connection management',
      hi: 'कनेक्शन प्रबंधन खोल रहे हैं',
      mr: 'कनेक्शन व्यवस्थापन उघडत आहे',
    },
  },

  // === WATER SERVICES ===
  {
    id: 'water_billing',
    action: 'openService',
    department: 'water',
    serviceId: 'billing',
    keywords: {
      en: ['pay water bill', 'water bill', 'water payment', 'pay water', 'paani bill'],
      hi: ['पानी का बिल', 'पानी बिल भरो', 'जल बिल', 'वॉटर बिल'],
      mr: ['पाणी बिल', 'पाणी बिल भरा', 'जल बिल', 'वॉटर बिल'],
    },
    feedback: {
      en: 'Opening water billing',
      hi: 'पानी बिलिंग खोल रहे हैं',
      mr: 'पाणी बिलिंग उघडत आहे',
    },
  },
  {
    id: 'water_new_connection',
    action: 'openService',
    department: 'water',
    serviceId: 'new_connection',
    keywords: {
      en: ['new water connection', 'water connection', 'apply water', 'get water connection', 'new water'],
      hi: ['नया पानी कनेक्शन', 'पानी कनेक्शन', 'जल कनेक्शन', 'नया जल कनेक्शन'],
      mr: ['नवीन पाणी कनेक्शन', 'पाणी कनेक्शन', 'जल कनेक्शन', 'नवीन जल कनेक्शन'],
    },
    feedback: {
      en: 'Opening water connection form',
      hi: 'पानी कनेक्शन फॉर्म खोल रहे हैं',
      mr: 'पाणी कनेक्शन फॉर्म उघडत आहे',
    },
  },
  {
    id: 'water_complaint',
    action: 'openService',
    department: 'water',
    serviceId: 'complaint',
    keywords: {
      en: ['water complaint', 'water problem', 'no water', 'water leakage', 'pipe leak', 'low pressure', 'water issue'],
      hi: ['पानी शिकायत', 'पानी समस्या', 'पानी नहीं', 'पाइप लीक', 'पानी लीकेज'],
      mr: ['पाणी तक्रार', 'पाणी समस्या', 'पाणी नाही', 'पाइप गळती', 'पाणी गळती'],
    },
    feedback: {
      en: 'Opening water complaint form',
      hi: 'पानी शिकायत फॉर्म खोल रहे हैं',
      mr: 'पाणी तक्रार फॉर्म उघडत आहे',
    },
  },
  {
    id: 'water_tanker',
    action: 'openService',
    department: 'water',
    serviceId: 'tanker',
    keywords: {
      en: ['water tanker', 'tanker service', 'book tanker', 'emergency water', 'bulk water'],
      hi: ['पानी टैंकर', 'टैंकर बुक करो', 'टैंकर सेवा', 'इमरजेंसी पानी'],
      mr: ['पाणी टँकर', 'टँकर बुक करा', 'टँकर सेवा', 'आपत्कालीन पाणी'],
    },
    feedback: {
      en: 'Opening tanker services',
      hi: 'टैंकर सेवाएं खोल रहे हैं',
      mr: 'टँकर सेवा उघडत आहे',
    },
  },
  {
    id: 'water_track',
    action: 'openService',
    department: 'water',
    serviceId: 'track',
    keywords: {
      en: ['track water', 'water status', 'water application status'],
      hi: ['पानी ट्रैक', 'जल स्थिति', 'पानी आवेदन स्थिति'],
      mr: ['पाणी ट्रॅक', 'जल स्थिती', 'पाणी अर्ज स्थिती'],
    },
    feedback: {
      en: 'Opening water tracking',
      hi: 'पानी ट्रैकिंग खोल रहे हैं',
      mr: 'पाणी ट्रॅकिंग उघडत आहे',
    },
  },

  // === GAS SERVICES ===
  {
    id: 'gas_new_connection',
    action: 'openService',
    department: 'gas',
    serviceId: 'new_connection',
    keywords: {
      en: ['new gas connection', 'gas connection', 'lpg connection', 'cylinder connection', 'new cylinder'],
      hi: ['नया गैस कनेक्शन', 'गैस कनेक्शन', 'एलपीजी कनेक्शन', 'सिलेंडर कनेक्शन'],
      mr: ['नवीन गॅस कनेक्शन', 'गॅस कनेक्शन', 'एलपीजी कनेक्शन', 'सिलेंडर कनेक्शन'],
    },
    feedback: {
      en: 'Opening gas connection form',
      hi: 'गैस कनेक्शन फॉर्म खोल रहे हैं',
      mr: 'गॅस कनेक्शन फॉर्म उघडत आहे',
    },
  },
  {
    id: 'gas_refill',
    action: 'openService',
    department: 'gas',
    serviceId: 'refill_booking',
    keywords: {
      en: ['gas refill', 'book cylinder', 'refill cylinder', 'gas booking', 'cylinder booking', 'book gas'],
      hi: ['गैस रिफिल', 'सिलेंडर बुक करो', 'गैस बुकिंग', 'सिलेंडर बुकिंग'],
      mr: ['गॅस रिफिल', 'सिलेंडर बुक करा', 'गॅस बुकिंग', 'सिलेंडर बुकिंग'],
    },
    feedback: {
      en: 'Opening gas refill booking',
      hi: 'गैस रिफिल बुकिंग खोल रहे हैं',
      mr: 'गॅस रिफिल बुकिंग उघडत आहे',
    },
  },
  {
    id: 'gas_complaint',
    action: 'openService',
    department: 'gas',
    serviceId: 'complaint',
    keywords: {
      en: ['gas complaint', 'gas leak', 'gas problem', 'cylinder problem', 'report gas'],
      hi: ['गैस शिकायत', 'गैस लीक', 'गैस समस्या', 'सिलेंडर समस्या'],
      mr: ['गॅस तक्रार', 'गॅस गळती', 'गॅस समस्या', 'सिलेंडर समस्या'],
    },
    feedback: {
      en: 'Opening gas complaint form',
      hi: 'गैस शिकायत फॉर्म खोल रहे हैं',
      mr: 'गॅस तक्रार फॉर्म उघडत आहे',
    },
  },

  // === MUNICIPAL SERVICES ===
  {
    id: 'municipal_property_tax',
    action: 'openService',
    department: 'municipal',
    serviceId: 'property_tax',
    keywords: {
      en: ['property tax', 'pay tax', 'house tax', 'building tax', 'pay property tax'],
      hi: ['प्रॉपर्टी टैक्स', 'संपत्ति कर', 'मकान टैक्स', 'घर टैक्स', 'टैक्स भरो'],
      mr: ['प्रॉपर्टी टॅक्स', 'मालमत्ता कर', 'घर टॅक्स', 'इमारत टॅक्स', 'कर भरा'],
    },
    feedback: {
      en: 'Opening property tax form',
      hi: 'प्रॉपर्टी टैक्स फॉर्म खोल रहे हैं',
      mr: 'प्रॉपर्टी टॅक्स फॉर्म उघडत आहे',
    },
  },
  {
    id: 'municipal_birth_death',
    action: 'openService',
    department: 'municipal',
    serviceId: 'birth_death',
    keywords: {
      en: ['birth certificate', 'death certificate', 'birth registration', 'death registration', 'birth death'],
      hi: ['जन्म प्रमाणपत्र', 'मृत्यु प्रमाणपत्र', 'जन्म पंजीकरण', 'मृत्यु पंजीकरण'],
      mr: ['जन्म प्रमाणपत्र', 'मृत्यू प्रमाणपत्र', 'जन्म नोंदणी', 'मृत्यू नोंदणी'],
    },
    feedback: {
      en: 'Opening birth/death certificate form',
      hi: 'जन्म/मृत्यु प्रमाणपत्र फॉर्म खोल रहे हैं',
      mr: 'जन्म/मृत्यू प्रमाणपत्र फॉर्म उघडत आहे',
    },
  },
  {
    id: 'municipal_trade_license',
    action: 'openService',
    department: 'municipal',
    serviceId: 'trade_license',
    keywords: {
      en: ['trade license', 'business license', 'shop license', 'license renewal'],
      hi: ['ट्रेड लाइसेंस', 'व्यापार लाइसेंस', 'दुकान लाइसेंस', 'लाइसेंस नवीनीकरण'],
      mr: ['ट्रेड लायसन्स', 'व्यापार परवाना', 'दुकान परवाना', 'परवाना नूतनीकरण'],
    },
    feedback: {
      en: 'Opening trade license form',
      hi: 'ट्रेड लाइसेंस फॉर्म खोल रहे हैं',
      mr: 'ट्रेड लायसन्स फॉर्म उघडत आहे',
    },
  },
  {
    id: 'municipal_grievance',
    action: 'openService',
    department: 'municipal',
    serviceId: 'grievance',
    keywords: {
      en: ['grievance', 'public grievance', 'file grievance', 'complaint municipal', 'civic complaint'],
      hi: ['शिकायत', 'जन शिकायत', 'सार्वजनिक शिकायत', 'नगरपालिका शिकायत'],
      mr: ['तक्रार', 'जन तक्रार', 'सार्वजनिक तक्रार', 'नगरपालिका तक्रार'],
    },
    feedback: {
      en: 'Opening grievance form',
      hi: 'शिकायत फॉर्म खोल रहे हैं',
      mr: 'तक्रार फॉर्म उघडत आहे',
    },
  },
  {
    id: 'municipal_sanitation',
    action: 'openService',
    department: 'municipal',
    serviceId: 'sanitation',
    keywords: {
      en: ['sanitation', 'garbage', 'waste', 'drain', 'sweeping', 'cleaning', 'dustbin'],
      hi: ['सफाई', 'कचरा', 'कूड़ा', 'नाली', 'सफाई सेवा', 'झाड़ू'],
      mr: ['स्वच्छता', 'कचरा', 'नाली', 'सफाई सेवा', 'झाड़ू'],
    },
    feedback: {
      en: 'Opening sanitation services',
      hi: 'सफाई सेवाएं खोल रहे हैं',
      mr: 'स्वच्छता सेवा उघडत आहे',
    },
  },
  {
    id: 'municipal_roads',
    action: 'openService',
    department: 'municipal',
    serviceId: 'roads',
    keywords: {
      en: ['roads', 'road repair', 'pothole', 'street light', 'footpath', 'road problem'],
      hi: ['सड़क', 'रोड रिपेयर', 'गड्ढा', 'स्ट्रीट लाइट', 'फुटपाथ', 'सड़क समस्या'],
      mr: ['रस्ता', 'रोड दुरुस्ती', 'खड्डा', 'स्ट्रीट लाइट', 'फूटपाथ', 'रस्ता समस्या'],
    },
    feedback: {
      en: 'Opening road services',
      hi: 'सड़क सेवाएं खोल रहे हैं',
      mr: 'रस्ता सेवा उघडत आहे',
    },
  },
];

/**
 * UI Action commands - triggers UI actions like submit, go back, etc.
 */
export const UI_ACTION_COMMANDS = [
  {
    id: 'go_back',
    action: 'goBack',
    keywords: {
      en: ['go back', 'back', 'previous', 'return', 'go previous'],
      hi: ['वापस', 'पीछे', 'वापस जाओ', 'पिछला'],
      mr: ['मागे', 'परत', 'मागे जा', 'मागील'],
    },
    feedback: {
      en: 'Going back',
      hi: 'वापस जा रहे हैं',
      mr: 'मागे जात आहे',
    },
  },
  {
    id: 'submit_form',
    action: 'submit',
    keywords: {
      en: ['submit', 'submit form', 'send', 'done', 'finish', 'complete'],
      hi: ['जमा करो', 'सबमिट', 'भेजो', 'पूरा करो', 'समाप्त'],
      mr: ['सबमिट करा', 'जमा करा', 'पाठवा', 'पूर्ण करा', 'संपवा'],
    },
    feedback: {
      en: 'Submitting form',
      hi: 'फॉर्म जमा कर रहे हैं',
      mr: 'फॉर्म सबमिट करत आहे',
    },
  },
  {
    id: 'close_dialog',
    action: 'closeDialog',
    keywords: {
      en: ['close', 'close this', 'cancel', 'exit', 'dismiss'],
      hi: ['बंद करो', 'बंद', 'कैंसल', 'बाहर'],
      mr: ['बंद करा', 'बंद', 'कॅन्सल', 'बाहेर'],
    },
    feedback: {
      en: 'Closing',
      hi: 'बंद कर रहे हैं',
      mr: 'बंद करत आहे',
    },
  },
  {
    id: 'scroll_down',
    action: 'scrollDown',
    keywords: {
      en: ['scroll down', 'go down', 'down', 'more', 'next'],
      hi: ['नीचे', 'नीचे जाओ', 'और', 'आगे'],
      mr: ['खाली', 'खाली जा', 'अधिक', 'पुढे'],
    },
    feedback: {
      en: 'Scrolling down',
      hi: 'नीचे जा रहे हैं',
      mr: 'खाली जात आहे',
    },
  },
  {
    id: 'scroll_up',
    action: 'scrollUp',
    keywords: {
      en: ['scroll up', 'go up', 'up', 'top'],
      hi: ['ऊपर', 'ऊपर जाओ', 'टॉप'],
      mr: ['वर', 'वर जा', 'टॉप'],
    },
    feedback: {
      en: 'Scrolling up',
      hi: 'ऊपर जा रहे हैं',
      mr: 'वर जात आहे',
    },
  },
  {
    id: 'help',
    action: 'showHelp',
    keywords: {
      en: ['help', 'help me', 'what can i say', 'commands', 'voice commands', 'voice help'],
      hi: ['मदद', 'मदद करो', 'सहायता', 'क्या बोलूं', 'कमांड'],
      mr: ['मदत', 'मदत करा', 'सहाय्य', 'काय बोलू', 'कमांड'],
    },
    feedback: {
      en: 'Showing voice commands help',
      hi: 'वॉइस कमांड मदद दिखा रहे हैं',
      mr: 'व्हॉइस कमांड मदत दाखवत आहे',
    },
  },
];

/**
 * Accessibility Mode Commands - for blind/visually impaired users
 */
export const ACCESSIBILITY_COMMANDS = [
  {
    id: 'enable_accessibility',
    action: 'enableAccessibility',
    keywords: {
      en: ['start accessibility mode', 'accessibility mode', 'blind mode', 'help me navigate', 'voice mode', 'enable accessibility', 'accessibility on'],
      hi: ['एक्सेसिबिलिटी मोड शुरू करो', 'अंधे के लिए मोड', 'मदद करो', 'वॉइस मोड', 'एक्सेसिबिलिटी चालू करो'],
      mr: ['एक्सेसिबिलिटी मोड सुरू करा', 'अंधांसाठी मोड', 'व्हॉइस मोड', 'एक्सेसिबिलिटी चालू करा'],
    },
    feedback: {
      en: 'Enabling accessibility mode',
      hi: 'एक्सेसिबिलिटी मोड चालू कर रहे हैं',
      mr: 'एक्सेसिबिलिटी मोड सुरू करत आहे',
    },
  },
  {
    id: 'disable_accessibility',
    action: 'disableAccessibility',
    keywords: {
      en: ['exit accessibility mode', 'stop accessibility', 'normal mode', 'disable accessibility', 'exit voice mode', 'accessibility off'],
      hi: ['एक्सेसिबिलिटी बंद करो', 'सामान्य मोड', 'वॉइस मोड बंद'],
      mr: ['एक्सेसिबिलिटी बंद करा', 'सामान्य मोड', 'व्हॉइस मोड बंद'],
    },
    feedback: {
      en: 'Exiting accessibility mode',
      hi: 'एक्सेसिबिलिटी मोड बंद कर रहे हैं',
      mr: 'एक्सेसिबिलिटी मोड बंद करत आहे',
    },
  },
  {
    id: 'repeat_prompt',
    action: 'repeatPrompt',
    keywords: {
      en: ['repeat', 'again', 'say again', 'what', 'repeat that', 'say that again'],
      hi: ['दोहराओ', 'फिर से', 'क्या', 'फिर से बोलो'],
      mr: ['परत सांगा', 'पुन्हा', 'पुन्हा बोला'],
    },
    feedback: {
      en: 'Repeating',
      hi: 'दोहरा रहे हैं',
      mr: 'परत सांगत आहे',
    },
  },
  {
    id: 'confirm_yes',
    action: 'confirmYes',
    keywords: {
      en: ['yes', 'yeah', 'correct', 'right', 'confirm', 'ok', 'okay', 'affirmative'],
      hi: ['हां', 'हाँ', 'सही', 'ठीक है', 'जी हां'],
      mr: ['हो', 'होय', 'बरोबर', 'ठीक आहे'],
    },
    feedback: {
      en: 'Confirmed',
      hi: 'पुष्टि हो गई',
      mr: 'पुष्टी झाली',
    },
  },
  {
    id: 'confirm_no',
    action: 'confirmNo',
    keywords: {
      en: ['no', 'nope', 'wrong', 'incorrect', 'negative'],
      hi: ['नहीं', 'गलत', 'ना'],
      mr: ['नाही', 'चुकीचे'],
    },
    feedback: {
      en: 'Cancelled',
      hi: 'रद्द किया',
      mr: 'रद्द केले',
    },
  },
  {
    id: 'change_field',
    action: 'changeField',
    keywords: {
      en: ['change', 'edit', 'modify', 'correct this', 'change this'],
      hi: ['बदलो', 'संशोधित करो', 'सुधारो', 'इसे बदलो'],
      mr: ['बदला', 'सुधारा', 'हे बदला'],
    },
    feedback: {
      en: 'Ready to change',
      hi: 'बदलने के लिए तैयार',
      mr: 'बदलण्यास तयार',
    },
  },
  {
    id: 'skip_field',
    action: 'skipField',
    keywords: {
      en: ['skip', 'pass', 'ignore', 'next field', 'skip this'],
      hi: ['छोड़ो', 'स्किप', 'आगे बढ़ो'],
      mr: ['सोडा', 'स्किप', 'पुढे जा'],
    },
    feedback: {
      en: 'Skipping field',
      hi: 'फील्ड छोड़ रहे हैं',
      mr: 'फील्ड सोडत आहे',
    },
  },
];

/**
 * All commands combined for processing
 */
export const ALL_COMMANDS = [
  ...NAVIGATION_COMMANDS,
  ...SERVICE_COMMANDS,
  ...UI_ACTION_COMMANDS,
  ...ACCESSIBILITY_COMMANDS,
];

/**
 * Process input text and find matching command
 * Uses keyword-based matching with fuzzy support
 *
 * @param {string} text - The recognized speech text
 * @param {string} currentLanguage - Current UI language (en, hi, mr)
 * @returns {Object|null} - Matched command or null
 */
export function matchCommand(text, currentLanguage = 'en') {
  console.log('[matchCommand] Input:', { text, currentLanguage });

  if (!text || typeof text !== 'string') {
    console.log('[matchCommand] Invalid input');
    return null;
  }

  // Normalize the input text
  const normalizedText = text.toLowerCase().trim();
  console.log('[matchCommand] Normalized text:', normalizedText);

  // Languages to check (prioritize current language)
  const languagesToCheck = [currentLanguage, 'en', 'hi', 'mr'].filter(
    (lang, index, self) => self.indexOf(lang) === index
  );
  console.log('[matchCommand] Languages to check:', languagesToCheck);

  let bestMatch = null;
  let bestScore = 0;
  let totalCommands = 0;

  for (const command of ALL_COMMANDS) {
    totalCommands++;
    for (const lang of languagesToCheck) {
      const keywords = command.keywords[lang] || [];

      for (const keyword of keywords) {
        const normalizedKeyword = keyword.toLowerCase();

        // Exact match gets highest score
        if (normalizedText === normalizedKeyword) {
          console.log('[matchCommand] ✅ EXACT MATCH found:', {
            command: command.id,
            keyword,
            lang,
          });
          return { ...command, matchedKeyword: keyword, matchedLanguage: lang, score: 100 };
        }

        // Check if text contains the keyword
        if (normalizedText.includes(normalizedKeyword)) {
          const score = (normalizedKeyword.length / normalizedText.length) * 90;
          console.log('[matchCommand] 🎯 Contains match:', {
            command: command.id,
            keyword,
            score,
            text: normalizedText,
          });
          if (score > bestScore) {
            bestScore = score;
            bestMatch = { ...command, matchedKeyword: keyword, matchedLanguage: lang, score };
          }
        }

        // Check if keyword contains the text (for shorter commands)
        if (normalizedKeyword.includes(normalizedText) && normalizedText.length >= 3) {
          const score = (normalizedText.length / normalizedKeyword.length) * 70;
          console.log('[matchCommand] 📝 Partial match:', {
            command: command.id,
            keyword,
            score,
            text: normalizedText,
          });
          if (score > bestScore) {
            bestScore = score;
            bestMatch = { ...command, matchedKeyword: keyword, matchedLanguage: lang, score };
          }
        }
      }
    }
  }

  console.log('[matchCommand] Search completed:', {
    totalCommands,
    bestScore,
    bestMatch: bestMatch ? bestMatch.id : 'none',
    threshold: 40,
  });

  // Return match only if score is above threshold
  const result = bestScore >= 40 ? bestMatch : null;
  console.log('[matchCommand] Final result:', result);
  return result;
}

/**
 * Get feedback message for a command in the specified language
 *
 * @param {Object} command - The matched command
 * @param {string} language - Language for feedback (en, hi, mr)
 * @returns {string} - Feedback message
 */
export function getCommandFeedback(command, language = 'en') {
  if (!command || !command.feedback) return '';
  return command.feedback[language] || command.feedback.en || '';
}

/**
 * Get help text with available commands
 *
 * @param {string} language - Language for help text
 * @returns {Array} - Array of help items
 */
export function getVoiceCommandHelp(language = 'en') {
  const helpTexts = {
    en: {
      title: 'Voice Commands',
      sections: [
        {
          title: 'Navigation',
          commands: [
            '"Open electricity" - Go to electricity services',
            '"Open water" - Go to water services',
            '"Open gas" - Go to gas services',
            '"Open municipal" - Go to municipal services',
            '"Go home" - Return to main page',
          ],
        },
        {
          title: 'Services',
          commands: [
            '"Pay bill" - Open billing section',
            '"New connection" - Apply for new connection',
            '"File complaint" - Register a complaint',
            '"Track application" - Check application status',
          ],
        },
        {
          title: 'Actions',
          commands: [
            '"Go back" - Return to previous screen',
            '"Submit" - Submit the current form',
            '"Close" - Close current dialog',
            '"Help" - Show this help',
          ],
        },
      ],
    },
    hi: {
      title: 'वॉइस कमांड',
      sections: [
        {
          title: 'नेविगेशन',
          commands: [
            '"बिजली खोलो" - बिजली सेवाएं',
            '"पानी खोलो" - पानी सेवाएं',
            '"गैस खोलो" - गैस सेवाएं',
            '"नगरपालिका खोलो" - नगरपालिका सेवाएं',
            '"होम जाओ" - मुख्य पेज',
          ],
        },
        {
          title: 'सेवाएं',
          commands: [
            '"बिल भरो" - बिलिंग सेक्शन',
            '"नया कनेक्शन" - नया कनेक्शन',
            '"शिकायत करो" - शिकायत दर्ज करें',
            '"ट्रैक करो" - आवेदन स्थिति',
          ],
        },
        {
          title: 'एक्शन',
          commands: [
            '"वापस" - पिछली स्क्रीन',
            '"जमा करो" - फॉर्म जमा करें',
            '"बंद करो" - डायलॉग बंद करें',
            '"मदद" - यह मदद दिखाएं',
          ],
        },
      ],
    },
    mr: {
      title: 'व्हॉइस कमांड',
      sections: [
        {
          title: 'नेव्हिगेशन',
          commands: [
            '"वीज उघडा" - वीज सेवा',
            '"पाणी उघडा" - पाणी सेवा',
            '"गॅस उघडा" - गॅस सेवा',
            '"नगरपालिका उघडा" - नगरपालिका सेवा',
            '"होम जा" - मुख्य पान',
          ],
        },
        {
          title: 'सेवा',
          commands: [
            '"बिल भरा" - बिलिंग सेक्शन',
            '"नवीन कनेक्शन" - नवीन कनेक्शन',
            '"तक्रार करा" - तक्रार नोंदवा',
            '"ट्रॅक करा" - अर्ज स्थिती',
          ],
        },
        {
          title: 'क्रिया',
          commands: [
            '"मागे" - मागील स्क्रीन',
            '"सबमिट करा" - फॉर्म सबमिट करा',
            '"बंद करा" - डायलॉग बंद करा',
            '"मदत" - ही मदत दाखवा',
          ],
        },
      ],
    },
  };

  return helpTexts[language] || helpTexts.en;
}

export default {
  NAVIGATION_COMMANDS,
  SERVICE_COMMANDS,
  UI_ACTION_COMMANDS,
  ACCESSIBILITY_COMMANDS,
  ALL_COMMANDS,
  matchCommand,
  getCommandFeedback,
  getVoiceCommandHelp,
};
