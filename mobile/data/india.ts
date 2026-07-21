export interface District {
  name: string;
  pincodes: string[];
}
export interface State {
  name: string;
  districts: District[];
}

export const INDIA_DATA: State[] = [
  { name: 'Andhra Pradesh', districts: [
    { name: 'Visakhapatnam', pincodes: ['530001','530002','530016'] },
    { name: 'Krishna', pincodes: ['521001','521002','521120'] },
    { name: 'Guntur', pincodes: ['522001','522002','522003'] },
    { name: 'Kurnool', pincodes: ['518001','518002','518003'] },
    { name: 'Kadapa', pincodes: ['516001','516002','516003'] },
  ]},
  { name: 'Arunachal Pradesh', districts: [
    { name: 'Itanagar (Papum Pare)', pincodes: ['791111','791112','791113'] },
    { name: 'Tawang', pincodes: ['790104','790105','790106'] },
    { name: 'West Kameng', pincodes: ['790001','790002','790003'] },
  ]},
  { name: 'Assam', districts: [
    { name: 'Kamrup Metropolitan', pincodes: ['781001','781003','781007'] },
    { name: 'Dibrugarh', pincodes: ['786001','786002','786003'] },
    { name: 'Jorhat', pincodes: ['785001','785002','785003'] },
    { name: 'Cachar', pincodes: ['788001','788002','788003'] },
  ]},
  { name: 'Bihar', districts: [
    { name: 'Patna', pincodes: ['800001','800002','800007'] },
    { name: 'Gaya', pincodes: ['823001','823002','823003'] },
    { name: 'Muzaffarpur', pincodes: ['842001','842002','842003'] },
    { name: 'Bhagalpur', pincodes: ['812001','812002','812003'] },
    { name: 'Darbhanga', pincodes: ['846001','846002','846003'] },
  ]},
  { name: 'Chhattisgarh', districts: [
    { name: 'Raipur', pincodes: ['492001','492002','492003'] },
    { name: 'Bilaspur', pincodes: ['495001','495002','495003'] },
    { name: 'Durg', pincodes: ['491001','491002','491003'] },
    { name: 'Rajnandgaon', pincodes: ['491441','491442','491443'] },
  ]},
  { name: 'Goa', districts: [
    { name: 'North Goa', pincodes: ['403001','403002','403101'] },
    { name: 'South Goa', pincodes: ['403601','403602','403603'] },
  ]},
  { name: 'Gujarat', districts: [
    { name: 'Ahmedabad', pincodes: ['380001','380002','380006'] },
    { name: 'Surat', pincodes: ['395001','395002','395003'] },
    { name: 'Vadodara', pincodes: ['390001','390002','390003'] },
    { name: 'Rajkot', pincodes: ['360001','360002','360003'] },
    { name: 'Bhavnagar', pincodes: ['364001','364002','364003'] },
  ]},
  { name: 'Haryana', districts: [
    { name: 'Gurugram', pincodes: ['122001','122002','122003'] },
    { name: 'Faridabad', pincodes: ['121001','121002','121003'] },
    { name: 'Hisar', pincodes: ['125001','125002','125003'] },
    { name: 'Rohtak', pincodes: ['124001','124002','124003'] },
    { name: 'Ambala', pincodes: ['134001','134002','134003'] },
  ]},
  { name: 'Himachal Pradesh', districts: [
    { name: 'Shimla', pincodes: ['171001','171002','171003'] },
    { name: 'Kullu', pincodes: ['175101','175102','175103'] },
    { name: 'Mandi', pincodes: ['175001','175002','175003'] },
    { name: 'Kangra', pincodes: ['176001','176002','176003'] },
  ]},
  { name: 'Jharkhand', districts: [
    { name: 'Ranchi', pincodes: ['834001','834002','834003'] },
    { name: 'Dhanbad', pincodes: ['826001','826002','826003'] },
    { name: 'Jamshedpur (East Singhbhum)', pincodes: ['831001','831002','831003'] },
    { name: 'Bokaro', pincodes: ['827001','827002','827003'] },
  ]},
  { name: 'Karnataka', districts: [
    { name: 'Bengaluru Urban', pincodes: ['560001','560002','560034'] },
    { name: 'Mysuru', pincodes: ['570001','570002','570003'] },
    { name: 'Belagavi', pincodes: ['590001','590002','590003'] },
    { name: 'Mangaluru (Dakshina Kannada)', pincodes: ['575001','575002','575003'] },
    { name: 'Hubballi-Dharwad', pincodes: ['580001','580002','580003'] },
  ]},
  { name: 'Kerala', districts: [
    { name: 'Thiruvananthapuram', pincodes: ['695001','695002','695003'] },
    { name: 'Ernakulam (Kochi)', pincodes: ['682001','682002','682016'] },
    { name: 'Kozhikode', pincodes: ['673001','673002','673003'] },
    { name: 'Thrissur', pincodes: ['680001','680002','680003'] },
    { name: 'Kollam', pincodes: ['691001','691002','691003'] },
  ]},
  { name: 'Madhya Pradesh', districts: [
    { name: 'Bhopal', pincodes: ['462001','462002','462003'] },
    { name: 'Indore', pincodes: ['452001','452002','452003'] },
    { name: 'Gwalior', pincodes: ['474001','474002','474003'] },
    { name: 'Jabalpur', pincodes: ['482001','482002','482003'] },
    { name: 'Ujjain', pincodes: ['456001','456002','456003'] },
  ]},
  { name: 'Maharashtra', districts: [
    { name: 'Mumbai City', pincodes: ['400001','400002','400020'] },
    { name: 'Pune', pincodes: ['411001','411002','411014'] },
    { name: 'Nagpur', pincodes: ['440001','440002','440003'] },
    { name: 'Nashik', pincodes: ['422001','422002','422003'] },
    { name: 'Aurangabad', pincodes: ['431001','431002','431003'] },
  ]},
  { name: 'Manipur', districts: [
    { name: 'Imphal West', pincodes: ['795001','795002','795003'] },
    { name: 'Bishnupur', pincodes: ['795126','795127','795128'] },
    { name: 'Churachandpur', pincodes: ['795128','795129','795130'] },
  ]},
  { name: 'Meghalaya', districts: [
    { name: 'East Khasi Hills (Shillong)', pincodes: ['793001','793002','793003'] },
    { name: 'West Khasi Hills', pincodes: ['793119','793120','793121'] },
    { name: 'Ri Bhoi', pincodes: ['793103','793104','793105'] },
  ]},
  { name: 'Mizoram', districts: [
    { name: 'Aizawl', pincodes: ['796001','796002','796003'] },
    { name: 'Lunglei', pincodes: ['796701','796702','796703'] },
    { name: 'Champhai', pincodes: ['796321','796322','796323'] },
  ]},
  { name: 'Nagaland', districts: [
    { name: 'Kohima', pincodes: ['797001','797002','797003'] },
    { name: 'Dimapur', pincodes: ['797112','797113','797114'] },
    { name: 'Mokokchung', pincodes: ['798601','798602','798603'] },
  ]},
  { name: 'Odisha', districts: [
    { name: 'Khorda (Bhubaneswar)', pincodes: ['751001','751002','751007'] },
    { name: 'Cuttack', pincodes: ['753001','753002','753003'] },
    { name: 'Ganjam', pincodes: ['760001','760002','760003'] },
    { name: 'Puri', pincodes: ['752001','752002','752003'] },
  ]},
  { name: 'Punjab', districts: [
    { name: 'Ludhiana', pincodes: ['141001','141002','141003'] },
    { name: 'Amritsar', pincodes: ['143001','143002','143003'] },
    { name: 'Jalandhar', pincodes: ['144001','144002','144003'] },
    { name: 'Patiala', pincodes: ['147001','147002','147003'] },
    { name: 'Bathinda', pincodes: ['151001','151002','151003'] },
  ]},
  { name: 'Rajasthan', districts: [
    { name: 'Jaipur', pincodes: ['302001','302002','302004'] },
    { name: 'Jodhpur', pincodes: ['342001','342002','342003'] },
    { name: 'Udaipur', pincodes: ['313001','313002','313003'] },
    { name: 'Kota', pincodes: ['324001','324002','324003'] },
    { name: 'Bikaner', pincodes: ['334001','334002','334003'] },
  ]},
  { name: 'Sikkim', districts: [
    { name: 'East Sikkim (Gangtok)', pincodes: ['737101','737102','737103'] },
    { name: 'West Sikkim', pincodes: ['737121','737122','737123'] },
    { name: 'North Sikkim', pincodes: ['737111','737112','737113'] },
    { name: 'South Sikkim', pincodes: ['737126','737127','737128'] },
  ]},
  { name: 'Tamil Nadu', districts: [
    { name: 'Chennai', pincodes: ['600001','600002','600017'] },
    { name: 'Coimbatore', pincodes: ['641001','641002','641004'] },
    { name: 'Madurai', pincodes: ['625001','625002','625003'] },
    { name: 'Tiruchirappalli', pincodes: ['620001','620002','620003'] },
    { name: 'Salem', pincodes: ['636001','636002','636003'] },
  ]},
  { name: 'Telangana', districts: [
    { name: 'Hyderabad', pincodes: ['500001','500002','500003'] },
    { name: 'Rangareddy', pincodes: ['500030','500031','500032'] },
    { name: 'Medchal–Malkajgiri', pincodes: ['500050','500051','500052'] },
    { name: 'Karimnagar', pincodes: ['505001','505002','505003'] },
  ]},
  { name: 'Tripura', districts: [
    { name: 'West Tripura (Agartala)', pincodes: ['799001','799002','799003'] },
    { name: 'South Tripura', pincodes: ['799140','799141','799142'] },
    { name: 'Gomati', pincodes: ['799120','799121','799122'] },
  ]},
  { name: 'Uttar Pradesh', districts: [
    { name: 'Lucknow', pincodes: ['226001','226002','226010'] },
    { name: 'Kanpur Nagar', pincodes: ['208001','208002','208003'] },
    { name: 'Agra', pincodes: ['282001','282002','282003'] },
    { name: 'Varanasi', pincodes: ['221001','221002','221003'] },
    { name: 'Prayagraj', pincodes: ['211001','211002','211003'] },
    { name: 'Meerut', pincodes: ['250001','250002','250003'] },
  ]},
  { name: 'Uttarakhand', districts: [
    { name: 'Dehradun', pincodes: ['248001','248002','248007'] },
    { name: 'Haridwar', pincodes: ['249401','249402','249403'] },
    { name: 'Nainital', pincodes: ['263001','263002','263003'] },
    { name: 'Udham Singh Nagar', pincodes: ['263153','263154','263155'] },
  ]},
  { name: 'West Bengal', districts: [
    { name: 'Kolkata', pincodes: ['700001','700002','700019'] },
    { name: 'Howrah', pincodes: ['711101','711102','711103'] },
    { name: 'North 24 Parganas', pincodes: ['700120','700121','700122'] },
    { name: 'South 24 Parganas', pincodes: ['743330','743331','743332'] },
    { name: 'Bardhaman', pincodes: ['713101','713102','713103'] },
  ]},
  // Union Territories
  { name: 'Delhi', districts: [
    { name: 'New Delhi', pincodes: ['110001','110002','110003'] },
    { name: 'East Delhi', pincodes: ['110051','110052','110053'] },
    { name: 'West Delhi', pincodes: ['110059','110060','110063'] },
    { name: 'South Delhi', pincodes: ['110017','110022','110024'] },
    { name: 'North Delhi', pincodes: ['110006','110007','110009'] },
  ]},
  { name: 'Jammu & Kashmir', districts: [
    { name: 'Srinagar', pincodes: ['190001','190002','190003'] },
    { name: 'Jammu', pincodes: ['180001','180002','180003'] },
    { name: 'Anantnag', pincodes: ['192101','192102','192103'] },
    { name: 'Baramulla', pincodes: ['193101','193102','193103'] },
  ]},
  { name: 'Ladakh', districts: [
    { name: 'Leh', pincodes: ['194101','194102','194103'] },
    { name: 'Kargil', pincodes: ['194103','194104','194105'] },
  ]},
  { name: 'Puducherry', districts: [
    { name: 'Puducherry', pincodes: ['605001','605002','605003'] },
    { name: 'Karaikal', pincodes: ['609601','609602','609603'] },
  ]},
  { name: 'Chandigarh', districts: [
    { name: 'Chandigarh', pincodes: ['160001','160002','160003'] },
  ]},
  { name: 'Andaman & Nicobar Islands', districts: [
    { name: 'South Andaman', pincodes: ['744101','744102','744103'] },
    { name: 'North & Middle Andaman', pincodes: ['744201','744202','744203'] },
  ]},
];

export const STATE_NAMES = INDIA_DATA.map((s) => s.name);

export function getDistricts(stateName: string): string[] {
  const state = INDIA_DATA.find((s) => s.name === stateName);
  return state ? state.districts.map((d) => d.name) : [];
}

export function getPincodes(stateName: string, districtName: string): string[] {
  const state = INDIA_DATA.find((s) => s.name === stateName);
  if (!state) return [];
  const district = state.districts.find((d) => d.name === districtName);
  return district ? district.pincodes : [];
}
