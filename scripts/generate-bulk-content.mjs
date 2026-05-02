#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

const vocabularyRows = [
  ['aprovechar', '활용하다, 잘 이용하다', 'verbo', 'Aprovecho el fin de semana para estudiar.', '주말을 활용해 공부합니다.', 'B1', 'B1.2', ['verb', 'common']],
  ['barrio', '동네, 구역', 'sustantivo', 'Vivo en un barrio tranquilo cerca del parque.', '저는 공원 근처 조용한 동네에 삽니다.', 'B1', 'B1.1', ['noun', 'city']],
  ['acogedor', '아늑한, 편안한', 'adjetivo', 'La cafetería es pequeña pero muy acogedora.', '그 카페는 작지만 매우 아늑합니다.', 'B1', 'B1.1', ['adjective', 'place']],
  ['sin embargo', '그럼에도 불구하고, 하지만', 'conector', 'Quería salir; sin embargo, empezó a llover.', '나가고 싶었지만, 그럼에도 비가 내리기 시작했습니다.', 'B2', 'B2.1', ['connector', 'contrast']],
  ['reunirse', '모이다, 만나다', 'verbo', 'Nos reunimos con el equipo el lunes por la mañana.', '우리는 월요일 아침에 팀과 만납니다.', 'B2', 'B2.1', ['verb', 'meeting']],
  ['resolver', '해결하다', 'verbo', 'Intento resolver el problema antes de pedir ayuda.', '도움을 요청하기 전에 문제를 해결하려고 합니다.', 'B1', 'B1.2', ['verb', 'problem']],
  ['elegir', '선택하다', 'verbo', 'Elegimos un restaurante cerca de la estación.', '우리는 역 근처 식당을 선택했습니다.', 'B1', 'B1.1', ['verb', 'daily']],
  ['explicar', '설명하다', 'verbo', 'La profesora explicó la diferencia con ejemplos claros.', '선생님은 명확한 예시로 차이를 설명했습니다.', 'B1', 'B1.1', ['verb', 'school']],
  ['compartir', '공유하다, 나누다', 'verbo', 'Comparto mis apuntes con una compañera de clase.', '저는 수업 친구와 필기를 공유합니다.', 'B1', 'B1.1', ['verb', 'school']],
  ['acostumbrarse', '익숙해지다', 'verbo', 'Me acostumbré al horario español después de una semana.', '일주일 뒤에 스페인식 시간표에 익숙해졌습니다.', 'B2', 'B2.1', ['verb', 'adaptation']],
  ['atreverse', '감히 하다, 용기를 내다', 'verbo', 'No me atreví a hablar en público al principio.', '처음에는 사람들 앞에서 말할 용기가 나지 않았습니다.', 'B2', 'B2.1', ['verb', 'emotion']],
  ['darse cuenta', '깨닫다, 알아차리다', 'verbo', 'Me di cuenta de que había olvidado la cartera.', '지갑을 잊고 왔다는 것을 알아차렸습니다.', 'B1', 'B1.2', ['verb', 'awareness']],
  ['llevarse bien', '사이가 좋다', 'verbo', 'Me llevo bien con mis vecinos.', '저는 이웃들과 사이가 좋습니다.', 'B1', 'B1.1', ['verb', 'relationship']],
  ['quejarse', '불평하다', 'verbo', 'Los clientes se quejaron del ruido de la obra.', '손님들은 공사 소음에 대해 불평했습니다.', 'B2', 'B2.1', ['verb', 'complaint']],
  ['proponer', '제안하다', 'verbo', 'Propuse cambiar la reunión al viernes.', '저는 회의를 금요일로 바꾸자고 제안했습니다.', 'B1', 'B1.2', ['verb', 'work']],
  ['conseguir', '얻다, 해내다', 'verbo', 'Conseguí entradas para el concierto.', '콘서트 표를 구했습니다.', 'B1', 'B1.1', ['verb', 'achievement']],
  ['mejorar', '개선하다, 나아지다', 'verbo', 'Mi pronunciación mejora cuando escucho podcasts.', '팟캐스트를 들으면 제 발음이 좋아집니다.', 'B1', 'B1.1', ['verb', 'learning']],
  ['empeorar', '악화되다', 'verbo', 'El tráfico empeoró por la lluvia.', '비 때문에 교통 상황이 악화되었습니다.', 'B1', 'B1.2', ['verb', 'change']],
  ['evitar', '피하다', 'verbo', 'Evito tomar café por la noche.', '저는 밤에는 커피를 마시는 것을 피합니다.', 'B1', 'B1.2', ['verb', 'habit']],
  ['ahorrar', '절약하다, 저축하다', 'verbo', 'Ahorro dinero para viajar en verano.', '여름에 여행하려고 돈을 모읍니다.', 'B1', 'B1.1', ['verb', 'money']],
  ['gastar', '쓰다, 소비하다', 'verbo', 'Gasté demasiado en ropa este mes.', '이번 달에는 옷에 돈을 너무 많이 썼습니다.', 'B1', 'B1.1', ['verb', 'money']],
  ['alquilar', '빌리다, 임대하다', 'verbo', 'Queremos alquilar un piso cerca del metro.', '우리는 지하철 근처 아파트를 빌리고 싶습니다.', 'B1', 'B1.2', ['verb', 'housing']],
  ['mudarse', '이사하다', 'verbo', 'Me mudé a Valencia por trabajo.', '저는 일 때문에 발렌시아로 이사했습니다.', 'B1', 'B1.2', ['verb', 'housing']],
  ['solicitar', '신청하다, 요청하다', 'verbo', 'Solicité una beca para estudiar en Madrid.', '마드리드에서 공부하려고 장학금을 신청했습니다.', 'B2', 'B2.1', ['verb', 'formal']],
  ['entregar', '제출하다, 전달하다', 'verbo', 'Entregamos el informe antes del plazo.', '우리는 마감 전에 보고서를 제출했습니다.', 'B1', 'B1.2', ['verb', 'work']],
  ['comprobar', '확인하다', 'verbo', 'Comprueba la dirección antes de salir.', '나가기 전에 주소를 확인하세요.', 'B1', 'B1.2', ['verb', 'instruction']],
  ['apuntarse', '등록하다, 신청하다', 'verbo', 'Me apunté a un curso de conversación.', '저는 회화 수업에 등록했습니다.', 'B1', 'B1.1', ['verb', 'learning']],
  ['cancelar', '취소하다', 'verbo', 'Cancelaron el vuelo por mal tiempo.', '악천후 때문에 항공편이 취소되었습니다.', 'B1', 'B1.1', ['verb', 'travel']],
  ['reservar', '예약하다', 'verbo', 'Reservé una mesa para cuatro personas.', '네 명 자리 테이블을 예약했습니다.', 'B1', 'B1.1', ['verb', 'restaurant']],
  ['retrasarse', '늦어지다, 지연되다', 'verbo', 'El tren se retrasó veinte minutos.', '기차가 20분 지연되었습니다.', 'B1', 'B1.2', ['verb', 'travel']],
  ['perderse', '길을 잃다', 'verbo', 'Nos perdimos en el casco antiguo.', '우리는 구시가지에서 길을 잃었습니다.', 'B1', 'B1.1', ['verb', 'travel']],
  ['fijarse', '주의해서 보다', 'verbo', 'Fíjate en los acentos de estas palabras.', '이 단어들의 악센트에 주의해서 보세요.', 'B2', 'B2.1', ['verb', 'learning']],
  ['confiar', '신뢰하다', 'verbo', 'Confío en mis amigos cuando necesito consejo.', '조언이 필요할 때 친구들을 신뢰합니다.', 'B1', 'B1.2', ['verb', 'relationship']],
  ['dudar', '의심하다, 망설이다', 'verbo', 'Dudo que tengamos tiempo suficiente.', '우리에게 시간이 충분할지 의심스럽습니다.', 'B2', 'B2.1', ['verb', 'subjunctive']],
  ['insistir', '고집하다, insist하다', 'verbo', 'Insistió en pagar la cena.', '그는 저녁값을 내겠다고 고집했습니다.', 'B2', 'B2.1', ['verb', 'communication']],
  ['lograr', '이루다, 달성하다', 'verbo', 'Logramos terminar el proyecto a tiempo.', '우리는 프로젝트를 제시간에 끝냈습니다.', 'B2', 'B2.1', ['verb', 'achievement']],
  ['reconocer', '인정하다, 알아보다', 'verbo', 'Reconozco que cometí un error.', '제가 실수했다는 것을 인정합니다.', 'B2', 'B2.1', ['verb', 'communication']],
  ['rechazar', '거절하다', 'verbo', 'Rechazó la oferta porque el horario era difícil.', '그는 근무 시간이 어려워서 제안을 거절했습니다.', 'B2', 'B2.1', ['verb', 'work']],
  ['admitir', '인정하다, 받아들이다', 'verbo', 'El museo admite visitas hasta las seis.', '그 박물관은 6시까지 입장을 받습니다.', 'B2', 'B2.1', ['verb', 'formal']],
  ['mantener', '유지하다', 'verbo', 'Mantengo una rutina de estudio diaria.', '저는 매일 공부 루틴을 유지합니다.', 'B1', 'B1.2', ['verb', 'habit']],
  ['apoyar', '지지하다, 돕다', 'verbo', 'Mis compañeros me apoyaron durante la entrevista.', '동료들이 면접 동안 저를 도와주었습니다.', 'B1', 'B1.2', ['verb', 'relationship']],
  ['afectar', '영향을 미치다', 'verbo', 'La falta de sueño afecta a la concentración.', '수면 부족은 집중력에 영향을 줍니다.', 'B2', 'B2.1', ['verb', 'health']],
  ['surgir', '발생하다, 생기다', 'verbo', 'Surgió un problema con la reserva.', '예약에 문제가 생겼습니다.', 'B2', 'B2.1', ['verb', 'problem']],
  ['pertenecer', '속하다', 'verbo', 'Este documento pertenece al archivo del curso.', '이 문서는 수업 자료 파일에 속합니다.', 'B2', 'B2.1', ['verb', 'formal']],
  ['encargarse', '담당하다', 'verbo', 'Me encargo de preparar las invitaciones.', '제가 초대장 준비를 담당합니다.', 'B2', 'B2.1', ['verb', 'responsibility']],
  ['enterarse', '알게 되다', 'verbo', 'Me enteré de la noticia por un mensaje.', '저는 메시지로 그 소식을 알게 되었습니다.', 'B1', 'B1.2', ['verb', 'information']],
  ['despedirse', '작별 인사를 하다', 'verbo', 'Nos despedimos en la estación.', '우리는 역에서 작별 인사를 했습니다.', 'B1', 'B1.1', ['verb', 'social']],
  ['arrepentirse', '후회하다', 'verbo', 'Me arrepentí de no preguntar antes.', '미리 물어보지 않은 것을 후회했습니다.', 'B2', 'B2.2', ['verb', 'emotion']],
  ['disfrutar', '즐기다', 'verbo', 'Disfrutamos mucho de la comida casera.', '우리는 집밥을 아주 즐겼습니다.', 'B1', 'B1.1', ['verb', 'daily']],
  ['opinar', '의견을 말하다', 'verbo', 'Cada estudiante opinó sobre el tema.', '각 학생이 주제에 대해 의견을 말했습니다.', 'B1', 'B1.2', ['verb', 'communication']],
  ['negociar', '협상하다', 'verbo', 'Negociamos el precio del alquiler.', '우리는 월세 가격을 협상했습니다.', 'B2', 'B2.2', ['verb', 'money']],
  ['organizar', '정리하다, 기획하다', 'verbo', 'Organizamos una cena para despedir a Marta.', '우리는 마르타를 배웅하려고 저녁 모임을 준비했습니다.', 'B1', 'B1.1', ['verb', 'planning']],
  ['cita', '약속, 예약', 'sustantivo', 'Tengo una cita con el dentista mañana.', '내일 치과 예약이 있습니다.', 'B1', 'B1.1', ['noun', 'daily']],
  ['factura', '영수증, 청구서', 'sustantivo', 'La factura de la luz llegó más alta este mes.', '이번 달 전기 요금 청구서가 더 높게 나왔습니다.', 'B1', 'B1.2', ['noun', 'money']],
  ['presupuesto', '예산', 'sustantivo', 'Necesitamos un presupuesto claro para el viaje.', '여행을 위한 명확한 예산이 필요합니다.', 'B2', 'B2.1', ['noun', 'money']],
  ['ventaja', '장점', 'sustantivo', 'Una ventaja de vivir aquí es el transporte público.', '여기에 사는 장점 하나는 대중교통입니다.', 'B1', 'B1.2', ['noun', 'opinion']],
  ['desventaja', '단점', 'sustantivo', 'La principal desventaja es el ruido por la noche.', '가장 큰 단점은 밤의 소음입니다.', 'B1', 'B1.2', ['noun', 'opinion']],
  ['costumbre', '습관, 관습', 'sustantivo', 'Tengo la costumbre de leer antes de dormir.', '저는 자기 전에 책을 읽는 습관이 있습니다.', 'B1', 'B1.1', ['noun', 'habit']],
  ['reto', '도전, 과제', 'sustantivo', 'Hablar por teléfono en español sigue siendo un reto.', '스페인어로 전화하는 것은 여전히 도전입니다.', 'B2', 'B2.1', ['noun', 'learning']],
  ['consejo', '조언', 'sustantivo', 'Tu consejo me ayudó a decidir.', '네 조언이 결정하는 데 도움이 되었습니다.', 'B1', 'B1.1', ['noun', 'communication']],
  ['encuesta', '설문 조사', 'sustantivo', 'Completamos una encuesta sobre hábitos de estudio.', '우리는 공부 습관에 관한 설문 조사를 작성했습니다.', 'B2', 'B2.1', ['noun', 'study']],
  ['experiencia', '경험', 'sustantivo', 'Fue una experiencia inolvidable.', '잊을 수 없는 경험이었습니다.', 'B1', 'B1.1', ['noun', 'travel']],
  ['empleo', '일자리, 고용', 'sustantivo', 'Busca empleo en una empresa internacional.', '그는 국제 회사에서 일자리를 찾고 있습니다.', 'B1', 'B1.2', ['noun', 'work']],
  ['entrevista', '면접, 인터뷰', 'sustantivo', 'La entrevista duró casi una hora.', '면접은 거의 한 시간 동안 이어졌습니다.', 'B1', 'B1.2', ['noun', 'work']],
  ['contrato', '계약서, 계약', 'sustantivo', 'Leí el contrato antes de firmarlo.', '서명하기 전에 계약서를 읽었습니다.', 'B2', 'B2.1', ['noun', 'formal']],
  ['horario', '시간표, 일정', 'sustantivo', 'El horario de la biblioteca cambia en verano.', '도서관 운영 시간이 여름에는 바뀝니다.', 'B1', 'B1.1', ['noun', 'time']],
  ['plazo', '기한', 'sustantivo', 'El plazo para enviar la solicitud termina hoy.', '신청서를 보내는 기한은 오늘 끝납니다.', 'B2', 'B2.1', ['noun', 'formal']],
  ['beca', '장학금', 'sustantivo', 'Recibí una beca para estudiar en Granada.', '그라나다에서 공부할 장학금을 받았습니다.', 'B1', 'B1.2', ['noun', 'study']],
  ['requisito', '요건, 필요 조건', 'sustantivo', 'Uno de los requisitos es tener nivel B1.', '요건 중 하나는 B1 수준을 갖추는 것입니다.', 'B2', 'B2.1', ['noun', 'formal']],
  ['vivienda', '주거, 주택', 'sustantivo', 'La vivienda es cara en el centro.', '도심의 주거비는 비쌉니다.', 'B1', 'B1.2', ['noun', 'housing']],
  ['alquiler', '월세, 임대', 'sustantivo', 'El alquiler incluye agua e internet.', '월세에는 물과 인터넷이 포함됩니다.', 'B1', 'B1.1', ['noun', 'housing']],
  ['vecino', '이웃', 'sustantivo', 'Mi vecino me ayudó con las cajas.', '이웃이 상자 옮기는 것을 도와주었습니다.', 'B1', 'B1.1', ['noun', 'housing']],
  ['ruido', '소음', 'sustantivo', 'El ruido de la calle no me deja dormir.', '거리의 소음 때문에 잠을 잘 수 없습니다.', 'B1', 'B1.1', ['noun', 'housing']],
  ['transporte', '교통, 운송', 'sustantivo', 'El transporte público funciona bien en esta ciudad.', '이 도시의 대중교통은 잘 운영됩니다.', 'B1', 'B1.1', ['noun', 'city']],
  ['atasco', '교통 체증', 'sustantivo', 'Llegamos tarde por un atasco enorme.', '심한 교통 체증 때문에 늦게 도착했습니다.', 'B1', 'B1.2', ['noun', 'city']],
  ['billete', '표, 승차권', 'sustantivo', 'Compré un billete de ida y vuelta.', '왕복 승차권을 샀습니다.', 'B1', 'B1.1', ['noun', 'travel']],
  ['destino', '목적지', 'sustantivo', 'Nuestro destino final es Bilbao.', '우리의 최종 목적지는 빌바오입니다.', 'B1', 'B1.2', ['noun', 'travel']],
  ['alojamiento', '숙소', 'sustantivo', 'Encontramos alojamiento cerca de la playa.', '해변 근처에서 숙소를 찾았습니다.', 'B1', 'B1.2', ['noun', 'travel']],
  ['equipaje', '짐, 수하물', 'sustantivo', 'Mi equipaje pesa demasiado.', '제 짐은 너무 무겁습니다.', 'B1', 'B1.1', ['noun', 'travel']],
  ['receta', '요리법, 처방전', 'sustantivo', 'Esta receta lleva pocos ingredientes.', '이 요리법에는 재료가 많이 들어가지 않습니다.', 'B1', 'B1.1', ['noun', 'food']],
  ['ingrediente', '재료', 'sustantivo', 'El ajo es un ingrediente básico en esta salsa.', '마늘은 이 소스의 기본 재료입니다.', 'B1', 'B1.1', ['noun', 'food']],
  ['sabor', '맛', 'sustantivo', 'El sabor es suave pero interesante.', '맛은 부드럽지만 흥미롭습니다.', 'B1', 'B1.1', ['noun', 'food']],
  ['salud', '건강', 'sustantivo', 'Dormir bien es importante para la salud.', '잘 자는 것은 건강에 중요합니다.', 'B1', 'B1.1', ['noun', 'health']],
  ['resfriado', '감기', 'sustantivo', 'Tengo un resfriado desde el lunes.', '월요일부터 감기에 걸렸습니다.', 'B1', 'B1.1', ['noun', 'health']],
  ['síntoma', '증상', 'sustantivo', 'El médico preguntó por mis síntomas.', '의사는 제 증상에 대해 물었습니다.', 'B1', 'B1.2', ['noun', 'health']],
  ['reunión', '회의, 모임', 'sustantivo', 'La reunión empieza a las diez en punto.', '회의는 정각 10시에 시작합니다.', 'B1', 'B1.1', ['noun', 'work']],
  ['acuerdo', '합의, 동의', 'sustantivo', 'Llegamos a un acuerdo después de hablar.', '우리는 이야기한 뒤 합의에 도달했습니다.', 'B2', 'B2.1', ['noun', 'work']],
  ['informe', '보고서', 'sustantivo', 'El informe resume los resultados del mes.', '보고서는 이번 달 결과를 요약합니다.', 'B2', 'B2.1', ['noun', 'work']],
  ['noticia', '뉴스, 소식', 'sustantivo', 'Leí una noticia sobre el cambio climático.', '기후 변화에 관한 뉴스를 읽었습니다.', 'B1', 'B1.2', ['noun', 'media']],
  ['artículo', '기사, 글', 'sustantivo', 'El artículo explica varias soluciones posibles.', '그 글은 가능한 여러 해결책을 설명합니다.', 'B2', 'B2.1', ['noun', 'media']],
  ['pantalla', '화면', 'sustantivo', 'La pantalla del móvil se rompió.', '휴대폰 화면이 깨졌습니다.', 'B1', 'B1.1', ['noun', 'technology']],
  ['contraseña', '비밀번호', 'sustantivo', 'Olvidé la contraseña de mi correo.', '이메일 비밀번호를 잊어버렸습니다.', 'B1', 'B1.2', ['noun', 'technology']],
  ['archivo', '파일, 자료', 'sustantivo', 'Guarda el archivo antes de cerrar el programa.', '프로그램을 닫기 전에 파일을 저장하세요.', 'B1', 'B1.2', ['noun', 'technology']],
  ['aplicación', '앱, 애플리케이션', 'sustantivo', 'Uso una aplicación para practicar vocabulario.', '어휘를 연습하려고 앱을 사용합니다.', 'B1', 'B1.1', ['noun', 'technology']],
  ['red', '네트워크, 망', 'sustantivo', 'La red del hotel es lenta por la noche.', '호텔 와이파이 네트워크는 밤에 느립니다.', 'B2', 'B2.1', ['noun', 'technology']],
  ['relación', '관계', 'sustantivo', 'Tenemos una relación de confianza.', '우리는 신뢰 관계를 가지고 있습니다.', 'B1', 'B1.2', ['noun', 'relationship']],
  ['confianza', '신뢰, 자신감', 'sustantivo', 'Hablar más me dio confianza.', '더 많이 말하면서 자신감이 생겼습니다.', 'B1', 'B1.2', ['noun', 'emotion']],
  ['oportunidad', '기회', 'sustantivo', 'Esta práctica es una buena oportunidad.', '이번 연습은 좋은 기회입니다.', 'B1', 'B1.1', ['noun', 'abstract']],
  ['esfuerzo', '노력', 'sustantivo', 'Tu esfuerzo se nota en la pronunciación.', '네 노력은 발음에서 드러납니다.', 'B1', 'B1.2', ['noun', 'learning']],
  ['meta', '목표', 'sustantivo', 'Mi meta es mantener una conversación natural.', '제 목표는 자연스러운 대화를 유지하는 것입니다.', 'B1', 'B1.1', ['noun', 'learning']],
  ['resultado', '결과', 'sustantivo', 'El resultado fue mejor de lo esperado.', '결과는 예상보다 좋았습니다.', 'B1', 'B1.2', ['noun', 'abstract']],
  ['disponible', '이용 가능한, 시간이 되는', 'adjetivo', 'Estoy disponible después de las cinco.', '저는 5시 이후에 시간이 됩니다.', 'B1', 'B1.1', ['adjective', 'time']],
  ['útil', '유용한', 'adjetivo', 'Este diccionario es muy útil para escribir.', '이 사전은 글쓰기에는 매우 유용합니다.', 'B1', 'B1.1', ['adjective', 'learning']],
  ['cómodo', '편안한, 편리한', 'adjetivo', 'El sofá es cómodo para leer.', '그 소파는 책 읽기에 편안합니다.', 'B1', 'B1.1', ['adjective', 'daily']],
  ['puntual', '시간을 잘 지키는, 정시의', 'adjetivo', 'El autobús suele ser puntual por la mañana.', '아침에는 버스가 보통 정시에 옵니다.', 'B1', 'B1.2', ['adjective', 'time']],
  ['probable', '가능성이 있는', 'adjetivo', 'Es probable que llueva esta tarde.', '오늘 오후에 비가 올 가능성이 있습니다.', 'B2', 'B2.1', ['adjective', 'subjunctive']],
  ['necesario', '필요한', 'adjetivo', 'Es necesario traer el pasaporte.', '여권을 가져오는 것이 필요합니다.', 'B1', 'B1.1', ['adjective', 'formal']],
  ['complicado', '복잡한, 어려운', 'adjetivo', 'El formulario parece complicado al principio.', '그 양식은 처음에는 복잡해 보입니다.', 'B1', 'B1.2', ['adjective', 'formal']],
  ['sencillo', '간단한, 쉬운', 'adjetivo', 'La explicación fue sencilla y clara.', '설명은 간단하고 명확했습니다.', 'B1', 'B1.1', ['adjective', 'learning']],
  ['seguro', '안전한, 확실한', 'adjetivo', 'Este barrio es seguro por la noche.', '이 동네는 밤에도 안전합니다.', 'B1', 'B1.1', ['adjective', 'city']],
  ['responsable', '책임감 있는', 'adjetivo', 'Buscan una persona responsable para el puesto.', '그들은 그 직책에 책임감 있는 사람을 찾고 있습니다.', 'B2', 'B2.1', ['adjective', 'work']],
  ['atento', '친절한, 세심한', 'adjetivo', 'El camarero fue muy atento con nosotros.', '웨이터는 우리에게 매우 세심하게 대해 주었습니다.', 'B1', 'B1.2', ['adjective', 'service']],
  ['cansado', '피곤한', 'adjetivo', 'Estoy cansado después del viaje.', '여행 후에 피곤합니다.', 'B1', 'B1.1', ['adjective', 'health']],
  ['orgulloso', '자랑스러운', 'adjetivo', 'Estoy orgulloso de mi progreso.', '저는 제 발전이 자랑스럽습니다.', 'B1', 'B1.2', ['adjective', 'emotion']],
  ['preocupado', '걱정하는', 'adjetivo', 'Estoy preocupado por el examen oral.', '말하기 시험이 걱정됩니다.', 'B1', 'B1.2', ['adjective', 'emotion']],
  ['sorprendido', '놀란', 'adjetivo', 'Me quedé sorprendido por la respuesta.', '그 대답에 놀랐습니다.', 'B1', 'B1.2', ['adjective', 'emotion']],
  ['adecuado', '적절한', 'adjetivo', 'Este nivel es adecuado para estudiantes B1.', '이 수준은 B1 학습자에게 적절합니다.', 'B2', 'B2.1', ['adjective', 'formal']],
  ['caro', '비싼', 'adjetivo', 'El alquiler es caro en esta zona.', '이 지역의 월세는 비쌉니다.', 'B1', 'B1.1', ['adjective', 'money']],
  ['barato', '저렴한', 'adjetivo', 'Encontré un billete barato para Málaga.', '말라가행 저렴한 표를 찾았습니다.', 'B1', 'B1.1', ['adjective', 'money']],
  ['gratuito', '무료의', 'adjetivo', 'La entrada al museo es gratuita los domingos.', '일요일에는 박물관 입장이 무료입니다.', 'B1', 'B1.2', ['adjective', 'travel']],
  ['local', '현지의, 지역의', 'adjetivo', 'Probamos comida local en el mercado.', '우리는 시장에서 현지 음식을 먹어 보았습니다.', 'B1', 'B1.1', ['adjective', 'culture']],
  ['internacional', '국제적인', 'adjetivo', 'Trabajo en un equipo internacional.', '저는 국제적인 팀에서 일합니다.', 'B1', 'B1.2', ['adjective', 'work']],
  ['sostenible', '지속 가능한', 'adjetivo', 'Quiero tener hábitos más sostenibles.', '더 지속 가능한 습관을 갖고 싶습니다.', 'B2', 'B2.1', ['adjective', 'environment']],
  ['saludable', '건강한', 'adjetivo', 'Caminar cada día es un hábito saludable.', '매일 걷는 것은 건강한 습관입니다.', 'B1', 'B1.1', ['adjective', 'health']],
  ['lleno', '가득 찬', 'adjetivo', 'El tren estaba lleno de turistas.', '기차는 관광객들로 가득 차 있었습니다.', 'B1', 'B1.1', ['adjective', 'travel']],
  ['vacío', '비어 있는', 'adjetivo', 'La sala estaba casi vacía.', '그 방은 거의 비어 있었습니다.', 'B1', 'B1.1', ['adjective', 'place']],
  ['ruidoso', '시끄러운', 'adjetivo', 'El apartamento es ruidoso por la noche.', '그 아파트는 밤에 시끄럽습니다.', 'B1', 'B1.1', ['adjective', 'housing']],
  ['tranquilo', '조용한, 평온한', 'adjetivo', 'Busco una zona tranquila para vivir.', '살기 좋은 조용한 지역을 찾고 있습니다.', 'B1', 'B1.1', ['adjective', 'housing']],
  ['urgente', '긴급한', 'adjetivo', 'Tengo una pregunta urgente sobre la reserva.', '예약에 관해 긴급한 질문이 있습니다.', 'B2', 'B2.1', ['adjective', 'formal']],
  ['reciente', '최근의', 'adjetivo', 'Una noticia reciente cambió nuestra opinión.', '최근 뉴스 하나가 우리의 의견을 바꾸었습니다.', 'B2', 'B2.1', ['adjective', 'media']],
  ['antiguo', '오래된, 고대의', 'adjetivo', 'Visitamos un puente antiguo en la ciudad.', '우리는 그 도시의 오래된 다리를 방문했습니다.', 'B1', 'B1.1', ['adjective', 'travel']],
  ['además', '게다가', 'conector', 'El curso es barato; además, está cerca de casa.', '그 수업은 저렴합니다. 게다가 집에서 가깝습니다.', 'B1', 'B1.2', ['connector', 'addition']],
  ['aunque', '비록 ...이지만', 'conector', 'Aunque estaba cansado, salí a caminar.', '피곤했지만 산책하러 나갔습니다.', 'B1', 'B1.2', ['connector', 'contrast']],
  ['mientras', '...하는 동안, 반면에', 'conector', 'Escucho música mientras cocino.', '요리하는 동안 음악을 듣습니다.', 'B1', 'B1.1', ['connector', 'time']],
  ['por eso', '그래서', 'conector', 'No dormí bien; por eso estoy cansado.', '잠을 잘 못 잤습니다. 그래서 피곤합니다.', 'B1', 'B1.1', ['connector', 'cause']],
  ['de hecho', '사실은', 'conector', 'De hecho, ya he visitado ese museo.', '사실 저는 이미 그 박물관을 방문했습니다.', 'B2', 'B2.1', ['connector', 'emphasis']],
  ['en cambio', '반면에', 'conector', 'Yo prefiero el tren; mi hermana, en cambio, prefiere el coche.', '저는 기차를 선호합니다. 반면 제 여동생은 자동차를 선호합니다.', 'B2', 'B2.1', ['connector', 'contrast']],
  ['por lo tanto', '그러므로', 'conector', 'El plazo termina hoy; por lo tanto, debemos enviarlo ya.', '기한이 오늘 끝납니다. 그러므로 지금 보내야 합니다.', 'B2', 'B2.1', ['connector', 'consequence']],
  ['a pesar de', '...에도 불구하고', 'conector', 'A pesar del frío, la plaza estaba llena.', '추위에도 불구하고 광장은 가득 차 있었습니다.', 'B2', 'B2.1', ['connector', 'contrast']],
  ['en cuanto a', '...에 관해서는', 'conector', 'En cuanto al alojamiento, prefiero algo céntrico.', '숙소에 관해서는 저는 중심가에 있는 곳을 선호합니다.', 'B2', 'B2.1', ['connector', 'topic']],
  ['cuanto antes', '가능한 한 빨리', 'expresión', 'Llámame cuanto antes, por favor.', '가능한 한 빨리 전화해 주세요.', 'B1', 'B1.2', ['expression', 'time']],
  ['a menudo', '자주', 'adverbio', 'A menudo desayuno fuera de casa.', '저는 자주 밖에서 아침을 먹습니다.', 'B1', 'B1.1', ['adverb', 'frequency']],
  ['de vez en cuando', '가끔', 'adverbio', 'De vez en cuando escribo un diario en español.', '가끔 스페인어로 일기를 씁니다.', 'B1', 'B1.1', ['adverb', 'frequency']],
  ['casi', '거의', 'adverbio', 'Casi perdimos el último autobús.', '우리는 마지막 버스를 거의 놓칠 뻔했습니다.', 'B1', 'B1.1', ['adverb', 'quantity']],
  ['apenas', '거의 ...않다', 'adverbio', 'Apenas entendí la primera explicación.', '첫 번째 설명은 거의 이해하지 못했습니다.', 'B2', 'B2.1', ['adverb', 'quantity']],
  ['todavía', '아직, 여전히', 'adverbio', 'Todavía no he terminado el ejercicio.', '아직 연습문제를 끝내지 못했습니다.', 'B1', 'B1.1', ['adverb', 'time']],
  ['ya', '이미, 벌써', 'adverbio', 'Ya compré los billetes para mañana.', '내일 표를 이미 샀습니다.', 'B1', 'B1.1', ['adverb', 'time']],
  ['incluso', '심지어', 'adverbio', 'Incluso los vecinos vinieron a la fiesta.', '심지어 이웃들도 파티에 왔습니다.', 'B2', 'B2.1', ['adverb', 'emphasis']],
  ['tal vez', '아마도', 'adverbio', 'Tal vez lleguemos un poco tarde.', '아마 우리가 조금 늦게 도착할지도 모릅니다.', 'B1', 'B1.2', ['adverb', 'possibility']],
  ['quizá', '아마도', 'adverbio', 'Quizá sea mejor esperar aquí.', '아마 여기서 기다리는 편이 더 나을지도 모릅니다.', 'B2', 'B2.1', ['adverb', 'subjunctive']],
  ['en realidad', '사실은, 실제로는', 'conector', 'En realidad, no conozco bien esta zona.', '사실 저는 이 지역을 잘 모릅니다.', 'B1', 'B1.2', ['connector', 'clarification']],
  ['sobre todo', '무엇보다도, 특히', 'conector', 'Me gusta leer, sobre todo novelas cortas.', '저는 읽는 것을 좋아합니다. 특히 짧은 소설을 좋아합니다.', 'B1', 'B1.2', ['connector', 'emphasis']],
  ['al menos', '적어도', 'adverbio', 'Necesitamos al menos dos horas para llegar.', '도착하려면 적어도 두 시간이 필요합니다.', 'B1', 'B1.1', ['adverb', 'quantity']],
  ['por supuesto', '물론', 'expresión', 'Por supuesto, puedes usar mi diccionario.', '물론 제 사전을 사용해도 됩니다.', 'B1', 'B1.1', ['expression', 'politeness']],
  ['desde luego', '물론, 확실히', 'expresión', 'Desde luego, la vista merece la pena.', '물론 그 전망은 볼 가치가 있습니다.', 'B2', 'B2.1', ['expression', 'emphasis']],
  ['en vez de', '...대신에', 'conector', 'Tomé té en vez de café.', '커피 대신 차를 마셨습니다.', 'B1', 'B1.2', ['connector', 'choice']],
  ['en lugar de', '...대신에', 'conector', 'Fuimos en autobús en lugar de ir en taxi.', '택시를 타는 대신 버스를 탔습니다.', 'B2', 'B2.1', ['connector', 'choice']],
  ['cada vez más', '점점 더', 'expresión', 'Cada vez más personas estudian español en línea.', '점점 더 많은 사람들이 온라인으로 스페인어를 공부합니다.', 'B2', 'B2.1', ['expression', 'trend']],
  ['por si acaso', '혹시 모르니', 'expresión', 'Lleva un paraguas por si acaso.', '혹시 모르니 우산을 가져가세요.', 'B1', 'B1.2', ['expression', 'planning']],
  ['hasta que', '...할 때까지', 'conector', 'Esperé hasta que llegó el autobús.', '버스가 올 때까지 기다렸습니다.', 'B1', 'B1.2', ['connector', 'time']],
  ['siempre que', '...하는 한, ...할 때마다', 'conector', 'Puedes venir siempre que avises antes.', '미리 알려주기만 하면 와도 됩니다.', 'B2', 'B2.1', ['connector', 'condition']],
  ['con tal de que', '...하기만 한다면', 'conector', 'Te ayudo con tal de que practiques después.', '나중에 연습하기만 한다면 도와줄게요.', 'B2', 'B2.2', ['connector', 'condition']],
  ['debido a', '...때문에', 'conector', 'El evento se canceló debido a la lluvia.', '비 때문에 행사가 취소되었습니다.', 'B2', 'B2.1', ['connector', 'cause']],
  ['gracias a', '...덕분에', 'conector', 'Gracias a tu ayuda, terminé el formulario.', '네 도움 덕분에 양식을 끝냈습니다.', 'B1', 'B1.2', ['connector', 'cause']],
  ['a causa de', '...때문에', 'conector', 'Llegamos tarde a causa del tráfico.', '교통 체증 때문에 늦게 도착했습니다.', 'B2', 'B2.1', ['connector', 'cause']],
  ['aun así', '그럼에도 불구하고', 'conector', 'Estaba nervioso; aun así, hablé con claridad.', '긴장했지만 그럼에도 분명하게 말했습니다.', 'B2', 'B2.1', ['connector', 'contrast']],
  ['por un lado', '한편으로는', 'conector', 'Por un lado, el piso es caro; por otro, está muy bien situado.', '한편으로 그 아파트는 비쌉니다. 다른 한편으로 위치가 아주 좋습니다.', 'B2', 'B2.1', ['connector', 'argument']],
  ['por otro lado', '다른 한편으로는', 'conector', 'Por otro lado, podríamos buscar otra fecha.', '다른 한편으로는 다른 날짜를 찾아볼 수도 있습니다.', 'B2', 'B2.1', ['connector', 'argument']],
  ['en resumen', '요약하면', 'conector', 'En resumen, necesitamos practicar más la conversación.', '요약하면 우리는 회화를 더 연습해야 합니다.', 'B2', 'B2.1', ['connector', 'summary']],
  ['al final', '결국, 마지막에', 'adverbio', 'Al final decidimos quedarnos en casa.', '결국 우리는 집에 머물기로 했습니다.', 'B1', 'B1.1', ['adverb', 'time']],
  ['al principio', '처음에는', 'adverbio', 'Al principio me costaba entender los acentos.', '처음에는 억양을 이해하는 것이 어려웠습니다.', 'B1', 'B1.1', ['adverb', 'time']],
  ['de repente', '갑자기', 'adverbio', 'De repente empezó a sonar el teléfono.', '갑자기 전화가 울리기 시작했습니다.', 'B1', 'B1.1', ['adverb', 'time']],
  ['poco a poco', '조금씩', 'adverbio', 'Poco a poco hablo con más seguridad.', '조금씩 더 자신 있게 말합니다.', 'B1', 'B1.1', ['adverb', 'progress']],
  ['merecer la pena', '할 가치가 있다', 'expresión', 'Merece la pena visitar el mercado temprano.', '일찍 시장을 방문할 가치가 있습니다.', 'B2', 'B2.1', ['expression', 'opinion']],
  ['tener ganas de', '...하고 싶다', 'expresión', 'Tengo ganas de probar comida mexicana.', '멕시코 음식을 먹어 보고 싶습니다.', 'B1', 'B1.1', ['expression', 'desire']],
  ['echar de menos', '그리워하다', 'expresión', 'Echo de menos la comida de mi casa.', '집밥이 그립습니다.', 'B1', 'B1.2', ['expression', 'emotion']],
  ['hacer falta', '필요하다', 'expresión', 'Hace falta más práctica antes del examen.', '시험 전에 더 많은 연습이 필요합니다.', 'B1', 'B1.2', ['expression', 'need']],
  ['tener en cuenta', '고려하다', 'expresión', 'Debemos tener en cuenta el presupuesto.', '우리는 예산을 고려해야 합니다.', 'B2', 'B2.1', ['expression', 'planning']],
  ['ponerse de acuerdo', '합의하다', 'expresión', 'Nos pusimos de acuerdo sobre la hora.', '우리는 시간에 대해 합의했습니다.', 'B2', 'B2.1', ['expression', 'communication']],
  ['estar de acuerdo', '동의하다', 'expresión', 'Estoy de acuerdo con tu propuesta.', '네 제안에 동의합니다.', 'B1', 'B1.1', ['expression', 'opinion']],
  ['estar harto de', '...에 질리다', 'expresión', 'Estoy harto del ruido de la calle.', '거리 소음에 질렸습니다.', 'B2', 'B2.1', ['expression', 'emotion']],
  ['tener lugar', '열리다, 발생하다', 'expresión', 'La reunión tendrá lugar en la sala grande.', '회의는 큰 회의실에서 열릴 예정입니다.', 'B2', 'B2.1', ['expression', 'formal']]
];

const grammarItems = [
  {
    id: 'g001',
    title: 'Ser y estar en contexto',
    level: 'B1',
    sublevel: 'B1.1',
    explanation_ko: 'ser은 본질·정체성·영구적인 특징을 말할 때, estar는 상태·위치를 말할 때 자주 씁니다.',
    questions: [
      fill('g001-q1', 'Madrid ___ una ciudad muy viva.', '마드리드는 매우 활기찬 도시입니다.', ['es'], '정체성이나 특징을 말하므로 ser를 씁니다.'),
      choice('g001-q2', 'Mi casa ___ cerca del metro.', '우리 집은 지하철 근처에 있습니다.', ['está', 'es', 'era', 'será'], 0, '위치이므로 estar가 맞습니다.'),
      choice('g001-q3', 'Hoy estoy ___ porque dormí poco.', '오늘은 잠을 적게 자서 피곤합니다.', ['cansado', 'profesor', 'coreano', 'de Madrid'], 0, '일시적인 상태를 말하므로 estar와 상태 형용사를 씁니다.')
    ]
  },
  {
    id: 'g002',
    title: 'Pretérito imperfecto vs indefinido',
    level: 'B1',
    sublevel: 'B1.2',
    explanation_ko: '불완전과거는 배경·습관·진행 중이던 상황, 부정과거는 완료된 사건을 말합니다.',
    questions: [
      fill('g002-q1', 'Cuando ___ pequeño, ___ al fútbol todos los días.', '어렸을 때 저는 매일 축구를 했습니다.', ['era', 'jugaba'], '어릴 때의 배경과 습관이므로 불완전과거를 씁니다.'),
      choice('g002-q2', 'Ayer ___ tarde al trabajo.', '어제 저는 직장에 늦게 도착했습니다.', ['llegué', 'llegaba', 'llego', 'llegaré'], 0, 'Ayer는 완료된 시점이므로 부정과거가 맞습니다.'),
      choice('g002-q3', 'Mientras ___, sonó el teléfono.', '제가 공부하고 있던 중에 전화가 울렸습니다.', ['estudiaba', 'estudié', 'estudio', 'estudiaré'], 0, '진행 중인 배경 행동은 불완전과거로 표현합니다.')
    ]
  },
  {
    id: 'g003',
    title: 'Por y para',
    level: 'B1',
    sublevel: 'B1.2',
    explanation_ko: 'por는 원인·경유·교환·기간, para는 목적·기한·수혜자를 말할 때 자주 씁니다.',
    questions: [
      fill('g003-q1', 'Gracias ___ tu ayuda.', '네 도움에 고마워.', ['por'], '감사의 원인을 나타내므로 por를 씁니다.'),
      choice('g003-q2', 'Estudio español ___ viajar.', '저는 여행하기 위해 스페인어를 공부합니다.', ['por', 'para', 'porque', 'desde'], 1, '목적을 말하므로 para가 맞습니다.'),
      choice('g003-q3', 'Este regalo es ___ mi madre.', '이 선물은 어머니를 위한 것입니다.', ['para', 'por', 'desde', 'hacia'], 0, '수혜자를 나타내므로 para를 씁니다.')
    ]
  },
  {
    id: 'g004',
    title: 'Subjuntivo presente',
    level: 'B2',
    sublevel: 'B2.1',
    explanation_ko: '희망, 요구, 감정, 의심 같은 표현 뒤에는 접속법 현재가 자주 옵니다.',
    questions: [
      fill('g004-q1', 'Espero que mañana ___ buen tiempo.', '내일 날씨가 좋기를 바랍니다.', ['haga'], '희망 표현 뒤에서는 접속법 현재가 자연스럽습니다.'),
      choice('g004-q2', 'Quiero que tú ___ conmigo.', '네가 나와 함께 오기를 원합니다.', ['vienes', 'vengas', 'vendrás', 'ven'], 1, '원하는 행동을 말할 때 접속법이 필요합니다.'),
      choice('g004-q3', 'Es importante que todos ___ a tiempo.', '모두가 제시간에 도착하는 것이 중요합니다.', ['llegan', 'lleguen', 'llegaron', 'llegaban'], 1, '평가 표현 뒤의 주어가 달라지면 접속법을 씁니다.')
    ]
  },
  {
    id: 'g005',
    title: 'Condicional para hipótesis',
    level: 'B2',
    sublevel: 'B2.1',
    explanation_ko: '가정이나 조언을 부드럽게 말할 때 조건법을 자주 씁니다.',
    questions: [
      fill('g005-q1', 'Si tuviera tiempo, ___ más.', '시간이 있다면 더 많이 여행할 텐데요.', ['viajaría'], '가정문에서 결과를 말하므로 조건법이 어울립니다.'),
      choice('g005-q2', 'Yo en tu lugar ___ con calma.', '내가 네 입장이라면 차분하게 대답할 거야.', ['respondería', 'respondo', 'responderé', 'respondí'], 0, '조언을 부드럽게 제안할 때 조건법을 씁니다.'),
      choice('g005-q3', '¿___ ayudarme con esta frase?', '이 문장을 도와주실 수 있을까요?', ['Podrías', 'Puedes', 'Pudiste', 'Podías'], 0, '정중한 부탁에는 조건법 podrías가 자연스럽습니다.')
    ]
  },
  {
    id: 'g006',
    title: 'Imperativo formal e informal',
    level: 'B1',
    sublevel: 'B1.2',
    explanation_ko: '명령형은 상대와 상황에 따라 tú, usted, vosotros, ustedes 형태가 달라집니다.',
    questions: [
      fill('g006-q1', 'Señora, ___ aquí, por favor.', '부인, 여기서 서명해 주세요.', ['firme'], 'usted에게 정중하게 말할 때는 접속법 현재 형태의 명령형을 씁니다.'),
      choice('g006-q2', 'Carlos, ___ la puerta, por favor.', '카를로스, 문 좀 닫아 줘.', ['cierra', 'cierre', 'cierras', 'cerró'], 0, 'tú에게 하는 긍정 명령은 보통 현재 3인칭 단수와 같은 형태입니다.'),
      choice('g006-q3', 'No ___ el móvil durante la clase.', '수업 중에는 휴대폰을 사용하지 마세요.', ['uses', 'usa', 'usas', 'usaste'], 0, '부정 명령에서는 tú도 접속법 현재 형태를 씁니다.')
    ]
  },
  {
    id: 'g007',
    title: 'Pronombres de objeto',
    level: 'B1',
    sublevel: 'B1.2',
    explanation_ko: '직접목적어는 lo/la/los/las, 간접목적어는 le/les로 받을 수 있으며, 둘이 함께 나오면 le가 se로 바뀝니다.',
    questions: [
      fill('g007-q1', 'El libro es interesante. ___ compré ayer.', '그 책은 흥미롭습니다. 저는 어제 그것을 샀습니다.', ['lo'], 'el libro는 남성 단수 직접목적어이므로 lo로 받습니다.'),
      choice('g007-q2', 'A María ___ envié un mensaje.', '마리아에게 메시지를 보냈습니다.', ['le', 'la', 'lo', 'las'], 0, '메시지를 받은 사람은 간접목적어이므로 le를 씁니다.'),
      choice('g007-q3', 'El informe se ___ mandé a mi jefe.', '그 보고서를 제 상사에게 보냈습니다.', ['lo', 'le', 'la', 'los'], 0, 'le lo는 함께 쓰지 않고 se lo로 바뀝니다.')
    ]
  },
  {
    id: 'g008',
    title: 'Oraciones de relativo',
    level: 'B2',
    sublevel: 'B2.1',
    explanation_ko: '관계절은 명사를 더 자세히 설명합니다. que는 넓게 쓰이고, donde는 장소, quien은 사람을 가리킬 때 씁니다.',
    questions: [
      fill('g008-q1', 'La cafetería ___ está en la esquina es muy tranquila.', '모퉁이에 있는 그 카페는 매우 조용합니다.', ['que'], '앞의 명사를 설명하는 기본 관계사는 que입니다.'),
      choice('g008-q2', 'El barrio ___ vivo tiene muchos árboles.', '제가 사는 동네에는 나무가 많습니다.', ['donde', 'quien', 'cuyo', 'cuando'], 0, '장소를 설명하므로 donde가 자연스럽습니다.'),
      choice('g008-q3', 'La persona con ___ hablé fue muy amable.', '제가 이야기한 사람은 매우 친절했습니다.', ['quien', 'donde', 'cuyo', 'cuando'], 0, '전치사 con 뒤에서 사람을 가리키므로 quien을 씁니다.')
    ]
  },
  {
    id: 'g009',
    title: 'Pluscuamperfecto',
    level: 'B2',
    sublevel: 'B2.1',
    explanation_ko: '대과거는 과거의 한 시점보다 더 이전에 이미 완료된 일을 말할 때 씁니다.',
    questions: [
      fill('g009-q1', 'Cuando llegué, la clase ya ___.', '제가 도착했을 때 수업은 이미 시작되어 있었습니다.', ['había empezado'], '도착보다 수업 시작이 먼저 일어났으므로 대과거를 씁니다.'),
      choice('g009-q2', 'No pude entrar porque ___ las llaves.', '열쇠를 잃어버렸기 때문에 들어갈 수 없었습니다.', ['había perdido', 'perdía', 'perdí', 'pierdo'], 0, '들어갈 수 없었던 과거보다 열쇠를 잃은 일이 더 먼저입니다.'),
      choice('g009-q3', 'Ella ya ___ el correo antes de la reunión.', '그녀는 회의 전에 이미 이메일을 보내 두었습니다.', ['había enviado', 'enviaba', 'envió', 'enviará'], 0, '회의 전 완료를 강조하므로 대과거가 맞습니다.')
    ]
  },
  {
    id: 'g010',
    title: 'Conectores de causa y consecuencia',
    level: 'B2',
    sublevel: 'B2.2',
    explanation_ko: '원인과 결과를 연결할 때 porque, debido a, por eso, por lo tanto 등을 문맥에 맞게 씁니다.',
    questions: [
      fill('g010-q1', 'El vuelo se canceló ___ mal tiempo.', '악천후 때문에 항공편이 취소되었습니다.', ['debido a'], '명사구 mal tiempo 앞에는 debido a가 자연스럽습니다.'),
      choice('g010-q2', 'No había plazas; ___, tuvimos que buscar otro hotel.', '자리가 없었습니다. 그래서 우리는 다른 호텔을 찾아야 했습니다.', ['por lo tanto', 'aunque', 'en cambio', 'a pesar de'], 0, '앞 문장의 결과를 말하므로 por lo tanto가 맞습니다.'),
      choice('g010-q3', 'Llegué temprano ___ quería repasar antes del examen.', '시험 전에 복습하고 싶어서 일찍 도착했습니다.', ['porque', 'sin embargo', 'en cuanto a', 'aun así'], 0, '동사절로 원인을 설명하므로 porque를 씁니다.')
    ]
  }
];

const readingSpecs = [
  reading('r001', 'Un día en el mercado', 'B1', 'B1.1',
    'Ayer fui al mercado y compré frutas frescas. El vendedor me recomendó mangos muy dulces.',
    '어제 시장에 가서 신선한 과일을 샀습니다. 판매자는 아주 달콤한 망고를 추천해 주었습니다.',
    {
      ayer: '어제',
      fui: '갔습니다 (ir, 부정과거 1인칭)',
      al: '~로, ~에',
      mercado: '시장',
      y: '그리고',
      compré: '샀습니다 (comprar, 부정과거 1인칭)',
      frutas: '과일들',
      frescas: '신선한',
      el: '그',
      vendedor: '판매자',
      me: '나에게',
      recomendó: '추천했습니다',
      mangos: '망고들',
      muy: '매우',
      dulces: '달콤한'
    }),
  reading('r002', 'Viaje en tren', 'B1', 'B1.2',
    'En el tren conocí a una pareja que viajaba a Sevilla. Hablamos del clima y de los sitios que querían visitar.',
    '기차 안에서 세비야로 여행하던 부부를 만났습니다. 우리는 날씨와 그들이 방문하고 싶어 했던 장소들에 대해 이야기했습니다.',
    {
      en: '~에서',
      el: '그',
      tren: '기차',
      conocí: '만났습니다',
      a: '~에게, ~로',
      una: '한',
      pareja: '부부, 커플',
      que: '~하는, ~인',
      viajaba: '여행하고 있었습니다',
      sevilla: '세비야',
      hablamos: '우리는 이야기했습니다',
      del: '~에 관한',
      clima: '날씨',
      y: '그리고',
      de: '~에 관해',
      los: '그',
      sitios: '장소들',
      querían: '원했습니다',
      visitar: '방문하다'
    }),
  reading('r003', 'Cocinar juntos', 'B1', 'B1.1',
    'Hoy cocino una sopa de verduras con mi hermana. Primero cortamos las zanahorias y luego añadimos sal.',
    '오늘 저는 동생과 채소 수프를 만듭니다. 먼저 당근을 자르고 그 다음에 소금을 넣습니다.',
    {
      hoy: '오늘',
      cocino: '요리합니다',
      una: '한',
      sopa: '수프',
      de: '~의',
      verduras: '채소',
      con: '~와 함께',
      mi: '나의',
      hermana: '언니/여동생',
      primero: '먼저',
      cortamos: '우리는 자릅니다',
      las: '그',
      zanahorias: '당근들',
      y: '그리고',
      luego: '그 다음에',
      añadimos: '우리는 넣습니다',
      sal: '소금'
    }),
  reading('r004', 'Una reunión breve', 'B2', 'B2.1',
    'En la oficina tuvimos una reunión breve. Mi jefa explicó el plan y todos hicieron preguntas concretas.',
    '사무실에서 짧은 회의를 했습니다. 제 상사는 계획을 설명했고 모두가 구체적인 질문을 했습니다.',
    {
      en: '~에서',
      la: '그',
      oficina: '사무실',
      tuvimos: '우리는 가졌습니다',
      una: '한',
      reunión: '회의',
      breve: '짧은',
      mi: '나의',
      jefa: '상사',
      explicó: '설명했습니다',
      el: '그',
      plan: '계획',
      y: '그리고',
      todos: '모두',
      hicieron: '했습니다',
      preguntas: '질문들',
      concretas: '구체적인'
    }),
  reading('r005', 'Paseo por el barrio', 'B2', 'B2.1',
    'Por la tarde paseé por mi barrio y saludé a la panadera. Después leí una noticia sobre el museo del centro.',
    '오후에 동네를 산책하며 빵집 아주머니께 인사했습니다. 그 후 도심 박물관에 관한 기사를 읽었습니다.',
    {
      por: '~동안, ~을 통해',
      la: '그',
      tarde: '오후',
      paseé: '산책했습니다',
      mi: '나의',
      barrio: '동네',
      y: '그리고',
      saludé: '인사했습니다',
      a: '~에게',
      panadera: '빵집 아주머니',
      después: '그 후에',
      leí: '읽었습니다',
      una: '한',
      noticia: '기사, 소식',
      sobre: '~에 관한',
      el: '그',
      museo: '박물관',
      del: '~의',
      centro: '도심'
    }),
  reading('r006', 'Hábitos sostenibles', 'B2', 'B2.2',
    'Cada mañana llevo una botella reutilizable al trabajo. Aunque parece un gesto pequeño, me ayuda a gastar menos plástico.',
    '매일 아침 저는 직장에 재사용 가능한 물병을 가져갑니다. 작은 행동처럼 보이지만 플라스틱을 덜 쓰는 데 도움이 됩니다.',
    {
      cada: '매',
      mañana: '아침',
      llevo: '가져갑니다',
      una: '한',
      botella: '병',
      reutilizable: '재사용 가능한',
      al: '~로',
      trabajo: '직장',
      aunque: '비록 ~이지만',
      parece: '보입니다',
      un: '하나의',
      gesto: '행동',
      pequeño: '작은',
      me: '나에게',
      ayuda: '도움이 됩니다',
      a: '~하는 데',
      gastar: '소비하다, 쓰다',
      menos: '더 적게',
      plástico: '플라스틱'
    })
];

const situations = [
  situation('s001', '카페에서 자연스럽게 주문하기', 'B1', 'B1.1', '마드리드의 작은 카페에서 커피와 간단한 아침 식사를 주문한다.',
    [
      turn('Cliente', 'Buenos días. ¿Me pones un café con leche y una tostada?', '안녕하세요. 카페라테 하나와 토스트 하나 주시겠어요?'),
      turn('Camarero', 'Claro. ¿La tostada con tomate o con mantequilla?', '물론이죠. 토스트는 토마토로 드릴까요, 버터로 드릴까요?'),
      turn('Cliente', 'Con tomate, por favor. ¿Cuánto es?', '토마토로 부탁드려요. 얼마인가요?'),
      turn('Camarero', 'Son cinco euros.', '5유로입니다.')
    ],
    [
      phrase('¿Me pones...?', '...을 주시겠어요?', '스페인 카페에서 아주 자연스럽게 쓰는 주문 표현'),
      phrase('por favor', '부탁합니다', '정중함을 더하는 기본 표현'),
      phrase('¿Cuánto es?', '얼마인가요?', '값을 물을 때 자주 쓰는 표현')
    ],
    [
      shadow('Buenos días. ¿Me pones un café con leche?', '안녕하세요. 카페라테 하나 주시겠어요?'),
      shadow('Con tomate, por favor.', '토마토로 부탁드려요.'),
      shadow('Son cinco euros.', '5유로입니다.')
    ]),
  situation('s002', '길 묻기', 'B1', 'B1.2', '낯선 동네에서 박물관 가는 길을 묻는다.',
    [
      turn('Turista', 'Perdón, ¿dónde está el museo del centro?', '실례합니다. 시내 박물관이 어디에 있나요?'),
      turn('Vecina', 'Está a dos calles de aquí. Sigue recto y gira a la derecha.', '여기서 두 블록 떨어져 있어요. 쭉 가다가 오른쪽으로 도세요.'),
      turn('Turista', 'Muchas gracias. ¿Está lejos?', '정말 감사합니다. 멀리 있나요?'),
      turn('Vecina', 'No, son unos cinco minutos a pie.', '아니요, 걸어서 5분 정도입니다.')
    ],
    [
      phrase('¿Dónde está...?', '...는 어디에 있나요?', '장소를 물을 때 가장 기본적인 표현'),
      phrase('Sigue recto', '곧장 가세요', '길 안내에서 자주 나오는 표현'),
      phrase('a pie', '걸어서', '이동 방법을 설명할 때 쓰는 표현')
    ],
    [
      shadow('¿Dónde está el museo del centro?', '시내 박물관이 어디에 있나요?'),
      shadow('Sigue recto y gira a la derecha.', '곧장 가다가 오른쪽으로 도세요.'),
      shadow('Son unos cinco minutos a pie.', '걸어서 5분 정도입니다.')
    ]),
  situation('s003', '호텔 체크인', 'B1', 'B1.2', '호텔 프런트에서 체크인하고 아침 식사 시간을 확인한다.',
    [
      turn('Recepcionista', 'Buenas tardes. ¿Tiene reserva?', '좋은 오후입니다. 예약하셨나요?'),
      turn('Cliente', 'Sí, a nombre de Kim.', '네, 김 이름으로 예약했어요.'),
      turn('Recepcionista', 'Perfecto. El desayuno es de siete a diez.', '좋습니다. 아침 식사는 7시부터 10시까지입니다.'),
      turn('Cliente', 'Gracias. ¿La habitación tiene wifi?', '감사합니다. 방에 와이파이가 있나요?')
    ],
    [
      phrase('¿Tiene reserva?', '예약하셨나요?', '호텔에서 아주 자주 듣는 문장'),
      phrase('a nombre de...', '... 이름으로', '예약자 이름을 말할 때 쓰는 표현'),
      phrase('de siete a diez', '7시부터 10시까지', '시간 범위를 말하는 표현')
    ],
    [
      shadow('Buenas tardes. ¿Tiene reserva?', '좋은 오후입니다. 예약하셨나요?'),
      shadow('Sí, a nombre de Kim.', '네, 김 이름으로 예약했어요.'),
      shadow('¿La habitación tiene wifi?', '방에 와이파이가 있나요?')
    ]),
  situation('s004', '친구와 약속 잡기', 'B2', 'B2.1', '친구와 이번 주말 만날 계획을 조율한다.',
    [
      turn('Amiga', '¿Te viene bien vernos el sábado por la tarde?', '토요일 오후에 만나는 게 괜찮아?'),
      turn('Amigo', 'Sí, me va perfecto. ¿Quedamos en la plaza?', '응, 완전 좋아. 광장에서 만날까?'),
      turn('Amiga', 'Genial. Si llueve, vamos a una cafetería.', '좋아. 비가 오면 카페로 가자.'),
      turn('Amigo', 'De acuerdo, te escribo antes de salir.', '좋아, 나가기 전에 메시지할게.')
    ],
    [
      phrase('me viene bien', '나에게 괜찮다', '일정 조율에서 매우 자연스러운 표현'),
      phrase('me va perfecto', '완벽하게 괜찮다', '구어체로 자주 쓰는 긍정 표현'),
      phrase('Si llueve', '비가 오면', '가정 상황을 말하는 조건절')
    ],
    [
      shadow('¿Te viene bien vernos el sábado por la tarde?', '토요일 오후에 만나는 게 괜찮아?'),
      shadow('¿Quedamos en la plaza?', '광장에서 만날까?'),
      shadow('Te escribo antes de salir.', '나가기 전에 메시지할게.')
    ]),
  situation('s005', '의사에게 증상 설명하기', 'B2', 'B2.1', '병원에서 감기 증상과 지속 시간을 설명한다.',
    [
      turn('Doctora', '¿Qué le pasa?', '어디가 불편하세요?'),
      turn('Paciente', 'Tengo fiebre desde anoche y me duele la garganta.', '어젯밤부터 열이 있고 목이 아픕니다.'),
      turn('Doctora', 'Beba mucha agua y descanse hoy.', '물을 많이 마시고 오늘은 쉬세요.'),
      turn('Paciente', '¿Tengo que tomar algún medicamento?', '약을 먹어야 하나요?')
    ],
    [
      phrase('¿Qué le pasa?', '어디가 불편하세요?', '의사가 환자에게 흔히 묻는 표현'),
      phrase('me duele...', '...이 아픕니다', '증상을 설명할 때 가장 자주 쓰는 표현'),
      phrase('desde anoche', '어젯밤부터', '지속 시점을 나타내는 표현')
    ],
    [
      shadow('Tengo fiebre desde anoche.', '어젯밤부터 열이 있습니다.'),
      shadow('Me duele la garganta.', '목이 아픕니다.'),
      shadow('Beba mucha agua y descanse hoy.', '물을 많이 마시고 오늘은 쉬세요.')
    ]),
  situation('s006', '집주인에게 수리 요청하기', 'B2', 'B2.1', '임대 아파트에서 난방 문제가 생겨 집주인에게 정중하게 수리를 요청한다.',
    [
      turn('Inquilina', 'Buenos días. La calefacción no funciona desde ayer.', '안녕하세요. 어제부터 난방이 작동하지 않습니다.'),
      turn('Propietario', 'Lo siento. ¿Ha comprobado el termostato?', '죄송합니다. 온도 조절기는 확인해 보셨나요?'),
      turn('Inquilina', 'Sí, pero sigue sin encenderse.', '네, 하지만 여전히 켜지지 않습니다.'),
      turn('Propietario', 'Enviaré a un técnico esta tarde.', '오늘 오후에 기술자를 보내겠습니다.')
    ],
    [
      phrase('no funciona', '작동하지 않습니다', '고장 상황을 설명하는 기본 표현'),
      phrase('sigue sin...', '여전히 ...하지 않다', '문제가 계속된다는 점을 말할 때 유용한 표현'),
      phrase('Enviaré a un técnico', '기술자를 보내겠습니다', '수리 대응을 약속하는 표현')
    ],
    [
      shadow('La calefacción no funciona desde ayer.', '어제부터 난방이 작동하지 않습니다.'),
      shadow('Sigue sin encenderse.', '여전히 켜지지 않습니다.'),
      shadow('Enviaré a un técnico esta tarde.', '오늘 오후에 기술자를 보내겠습니다.')
    ]),
  situation('s007', '면접에서 경험 말하기', 'B2', 'B2.2', '구직 면접에서 이전 경험과 강점을 간결하게 설명한다.',
    [
      turn('Entrevistadora', 'Cuénteme un poco sobre su experiencia.', '경험에 대해 조금 말씀해 주세요.'),
      turn('Candidata', 'He trabajado dos años en atención al cliente.', '저는 고객 응대 분야에서 2년 동안 일했습니다.'),
      turn('Entrevistadora', '¿Cuál diría que es su mayor fortaleza?', '가장 큰 강점이 무엇이라고 말하시겠어요?'),
      turn('Candidata', 'Soy responsable y me adapto rápido a los cambios.', '저는 책임감이 있고 변화에 빠르게 적응합니다.')
    ],
    [
      phrase('Cuénteme un poco sobre...', '...에 대해 조금 말씀해 주세요', '면접에서 자주 나오는 요청'),
      phrase('atención al cliente', '고객 응대', '서비스 업무를 설명하는 표현'),
      phrase('me adapto rápido', '빠르게 적응합니다', '강점을 말할 때 좋은 표현')
    ],
    [
      shadow('He trabajado dos años en atención al cliente.', '저는 고객 응대 분야에서 2년 동안 일했습니다.'),
      shadow('Soy responsable.', '저는 책임감이 있습니다.'),
      shadow('Me adapto rápido a los cambios.', '변화에 빠르게 적응합니다.')
    ]),
  situation('s008', '우체국에서 소포 보내기', 'B1', 'B1.2', '우체국에서 해외로 소포를 보내며 배송 기간과 비용을 묻는다.',
    [
      turn('Cliente', 'Quiero enviar este paquete a Corea.', '이 소포를 한국으로 보내고 싶습니다.'),
      turn('Empleada', '¿Prefiere envío normal o urgente?', '일반 배송을 원하시나요, 급행 배송을 원하시나요?'),
      turn('Cliente', 'Normal, por favor. ¿Cuánto tarda?', '일반으로 부탁드립니다. 얼마나 걸리나요?'),
      turn('Empleada', 'Tarda entre siete y diez días.', '7일에서 10일 정도 걸립니다.')
    ],
    [
      phrase('Quiero enviar...', '...을 보내고 싶습니다', '우체국에서 바로 쓸 수 있는 표현'),
      phrase('envío normal o urgente', '일반 배송 또는 급행 배송', '배송 옵션을 말하는 표현'),
      phrase('¿Cuánto tarda?', '얼마나 걸리나요?', '소요 시간을 물을 때 쓰는 표현')
    ],
    [
      shadow('Quiero enviar este paquete a Corea.', '이 소포를 한국으로 보내고 싶습니다.'),
      shadow('¿Prefiere envío normal o urgente?', '일반 배송을 원하시나요, 급행 배송을 원하시나요?'),
      shadow('Tarda entre siete y diez días.', '7일에서 10일 정도 걸립니다.')
    ]),
  situation('s009', '언어 교환 모임에서 대화 시작하기', 'B1', 'B1.2', '언어 교환 모임에서 처음 만난 사람과 자연스럽게 대화를 시작한다.',
    [
      turn('Estudiante', 'Hola, soy Minji. ¿Es tu primera vez aquí?', '안녕하세요, 저는 민지예요. 여기 처음 오셨어요?'),
      turn('Compañero', 'Sí, vengo para practicar español y conocer gente.', '네, 스페인어를 연습하고 사람들을 만나려고 왔어요.'),
      turn('Estudiante', 'Yo también. Podemos hablar diez minutos en español y diez en coreano.', '저도요. 스페인어로 10분, 한국어로 10분 이야기할 수 있어요.'),
      turn('Compañero', 'Perfecto, me parece una buena idea.', '좋아요, 좋은 생각 같아요.')
    ],
    [
      phrase('¿Es tu primera vez aquí?', '여기 처음이세요?', '처음 만난 사람에게 자연스럽게 묻는 표현'),
      phrase('conocer gente', '사람들을 만나다', '사회적 목적을 말할 때 자주 쓰는 표현'),
      phrase('me parece una buena idea', '좋은 생각 같아요', '상대 제안에 동의하는 표현')
    ],
    [
      shadow('¿Es tu primera vez aquí?', '여기 처음이세요?'),
      shadow('Vengo para practicar español.', '스페인어를 연습하려고 왔어요.'),
      shadow('Me parece una buena idea.', '좋은 생각 같아요.')
    ]),
  situation('s010', '기차역에서 문제 해결하기', 'B2', 'B2.1', '기차가 지연되어 역 직원에게 대체 방법을 묻는다.',
    [
      turn('Viajera', 'Perdone, mi tren lleva media hora de retraso.', '실례합니다. 제 기차가 30분째 지연되고 있습니다.'),
      turn('Empleado', 'Sí, hay una avería en la vía.', '네, 선로에 고장이 있습니다.'),
      turn('Viajera', '¿Hay algún tren alternativo para llegar a Bilbao?', '빌바오에 도착할 대체 기차가 있나요?'),
      turn('Empleado', 'Puede tomar el tren regional de las seis.', '6시 지역 열차를 타실 수 있습니다.')
    ],
    [
      phrase('lleva media hora de retraso', '30분째 지연되고 있습니다', '지연 시간을 말할 때 쓰는 구조'),
      phrase('tren alternativo', '대체 기차', '문제 해결 상황에서 유용한 표현'),
      phrase('Puede tomar...', '...을 타실 수 있습니다', '교통 수단을 안내하는 표현')
    ],
    [
      shadow('Mi tren lleva media hora de retraso.', '제 기차가 30분째 지연되고 있습니다.'),
      shadow('¿Hay algún tren alternativo?', '대체 기차가 있나요?'),
      shadow('Puede tomar el tren regional de las seis.', '6시 지역 열차를 타실 수 있습니다.')
    ])
];

function fill(id, stem, stemKo, answers, explanationKo) {
  return {
    id,
    type: 'fill',
    stem,
    stem_ko: stemKo,
    accepted_answers: [answers],
    case_sensitive: false,
    accent_sensitive: true,
    explanation_ko: explanationKo
  };
}

function choice(id, stem, stemKo, choices, answerIndex, explanationKo) {
  return {
    id,
    type: 'choice',
    stem,
    stem_ko: stemKo,
    choices,
    answer_index: answerIndex,
    explanation_ko: explanationKo
  };
}

function reading(id, title, level, sublevel, text, translationKo, glosses) {
  return {
    id,
    title,
    level,
    sublevel,
    tokens: tokenize(text, glosses),
    translation_ko: translationKo
  };
}

function situation(id, title, level, sublevel, sceneKo, dialogue, keyPhrases, shadowing) {
  return {
    id,
    title,
    level,
    sublevel,
    scene_ko: sceneKo,
    dialogue,
    key_phrases: keyPhrases,
    shadowing
  };
}

function turn(speaker, es, ko) {
  return { speaker, es, ko };
}

function phrase(es, ko, noteKo) {
  return { es, ko, note_ko: noteKo };
}

function shadow(es, ko) {
  return { es, ko };
}

function tokenize(text, glosses) {
  const tokens = text.match(/[\p{L}\p{N}]+|\s+|[^\s\p{L}\p{N}]+/gu) || [];
  return tokens.map((token) => {
    if (!/[\p{L}\p{N}]/u.test(token)) {
      return { es: token, ko: null };
    }

    const key = token.toLowerCase();
    const ko = glosses[key];
    if (!ko) {
      throw new Error(`Missing gloss for "${token}" in "${text}"`);
    }
    return { es: token, ko };
  });
}

function withIds(prefix, rows) {
  return rows.map(([es, ko, pos, exampleEs, exampleKo, level, sublevel, tags], index) => ({
    id: `${prefix}${String(index + 1).padStart(3, '0')}`,
    es,
    ko,
    pos,
    example_es: exampleEs,
    example_ko: exampleKo,
    level,
    sublevel,
    tags
  }));
}

function writeJson(relativePath, payload) {
  const targetPath = path.join(repoRoot, relativePath);
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}

function assertUnique(items, label) {
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) {
      throw new Error(`${label}: duplicate id ${item.id}`);
    }
    ids.add(item.id);
  }
}

const vocabulary = withIds('v', vocabularyRows);

if (vocabulary.length < 150) {
  throw new Error(`Expected at least 150 vocabulary items, got ${vocabulary.length}`);
}
if (grammarItems.length < 10) {
  throw new Error(`Expected at least 10 grammar items, got ${grammarItems.length}`);
}
if (readingSpecs.length < 6) {
  throw new Error(`Expected at least 6 reading items, got ${readingSpecs.length}`);
}
if (situations.length < 10) {
  throw new Error(`Expected at least 10 situation items, got ${situations.length}`);
}

assertUnique(vocabulary, 'vocabulary');
assertUnique(grammarItems, 'grammar');
assertUnique(readingSpecs, 'reading');
assertUnique(situations, 'situations');

writeJson('data/vocabulary.json', { version: 1, items: vocabulary });
writeJson('data/grammar.json', { version: 1, items: grammarItems });
writeJson('data/reading.json', { version: 1, items: readingSpecs });
writeJson('data/situations.json', { version: 1, items: situations });

console.log(`Generated ${vocabulary.length} vocabulary, ${grammarItems.length} grammar, ${readingSpecs.length} reading, ${situations.length} situations.`);
