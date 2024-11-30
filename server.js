const express = require('express')
const app = express()

app.use(express.static(__dirname + '/public'))
app.set('view engine', 'ejs')
app.use(express.json())
app.use(express.urlencoded({extended:true})) 

const { MongoClient } = require('mongodb')

let db
const url = 'mongodb+srv://joonmin:qwer1234@dataweb.0ircg.mongodb.net/?retryWrites=true&w=majority&appName=dataWeb'
new MongoClient(url).connect().then((client)=>{
  console.log('DB연결성공')
  db = client.db('forum')
  app.listen(8080, () => {
    console.log('http://localhost:8080 에서 서버 실행중')
})
}).catch((err)=>{
  console.log(err)
})



app.get('/list', async (req, res) => {
    let result = await db.collection('post').find().toArray()
    res.render('list.ejs', {글목록 : result})
})  

app.get('/person_write', (req, res) => {

    res.render('person_write.ejs')
})

app.get('/company_write', (req, res) => {

    res.render('company_write.ejs')
})

app.get('/working', (req, res) => {

    res.render('working.ejs')
})

app.get('/person_info', (req, res) => {

    res.render('person_info.ejs')
})

app.get('/company_info', (req, res) => {

    res.render('company_info.ejs')
})

app.get('/delete_person', (req, res) => {

    res.render('delete_person.ejs')
})

app.get('/delete_company', (req, res) => {

    res.render('delete_company.ejs')
})

app.post('/delete_person_info', async (req, res) => {
    try {
        const { 주민등록번호 } = req.body;

        if (!주민등록번호) {
            return res.status(400).send('주민등록번호를 입력해주세요.');
        }

        // 1. person 컬렉션에서 주민등록번호로 문서 삭제
        const personResult = await db.collection('people').deleteOne({ 주민등록번호 });

        // 2. workingDays 컬렉션에서 주민등록번호로 관련 문서 삭제
        const workingDaysResult = await db.collection('workingDays').deleteMany({ 주민등록번호 });

        // 결과 반환
        res.status(200).send(`
            <h2>삭제 결과</h2>
            <p>person 컬렉션에서 ${personResult.deletedCount}개의 문서 삭제</p>
            <p>workingDays 컬렉션에서 ${workingDaysResult.deletedCount}개의 문서 삭제</p>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('서버 오류가 발생했습니다.');
    }
});
app.post('/delete_company_info', async (req, res) => {
    try {
        const { 회사_id } = req.body;

        if (!회사_id) {
            return res.status(400).send('회사_id를 입력해주세요.');
        }

        // 1. person 컬렉션에서 회사_id로 문서 삭제
        const companyResult = await db.collection('company').deleteOne({ 회사_고유_id: parseInt(회사_id, 10) });

        // 2. workingDays 컬렉션에서 회사_id로 관련 문서 삭제
        const workingDaysResult = await db.collection('workingDays').deleteMany({ 회사_id: parseInt(회사_id, 10) });

        // 결과 반환
        res.status(200).send(`
            <h2>삭제 결과</h2>
            <p>company 컬렉션에서 ${companyResult.deletedCount}개의 문서 삭제</p>
            <p>workingDays 컬렉션에서 ${workingDaysResult.deletedCount}개의 문서 삭제</p>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('서버 오류가 발생했습니다.');
    }
});

app.post('/get_person_info', async (req, res) => {
    try {
        // 1. 클라이언트에서 주민등록번호 가져오기
        const { 주민등록번호 } = req.body;

        if (!주민등록번호) {
            return res.status(400).send('주민등록번호를 입력해주세요.');
        }

        // 2. people 컬렉션에서 주민등록번호로 정보 조회
        const person = await db.collection('people').findOne({ 주민등록번호 });
        if (!person) {
            return res.status(404).send('해당 주민등록번호를 가진 사용자가 없습니다.');
        }

        // 3. workingDays 컬렉션에서 근무요일 및 회사 ID 조회
        const workingDays = await db.collection('workingDays')
            .find({ 주민등록번호 })
            .toArray();

        // 4. 근무요일을 월, 화, 수, 목, 금, 토, 일 순으로 정렬
        const dayOrder = ['월', '화', '수', '목', '금', '토', '일'];
        const sortedDaysWithCompany = workingDays
            .map((record) => ({
                근무요일: record.근무요일,
                회사_id: record.회사_id
            }))
            .filter((record) => dayOrder.includes(record.근무요일)) // 유효하지 않은 요일 제거
            .sort((a, b) => dayOrder.indexOf(a.근무요일) - dayOrder.indexOf(b.근무요일));

        // 5. 결과 출력
        const dayOutput = sortedDaysWithCompany
            .map(record => `${record.근무요일} (회사_id: ${record.회사_id})`)
            .join(', ');

        res.status(200).send(`
            <h2>사용자 정보</h2>
            <p>이름: ${person.이름}</p>
            <p>주민등록번호: ${person.주민등록번호}</p>
            <p>전화번호: ${person.전화번호}</p>
            <h2>근무요일</h2>
            <p>${dayOutput}</p>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('서버 오류가 발생했습니다.');
    }
});


app.post('/get_company_info', async (req, res) => {
    try {
        // 클라이언트에서 회사_id 가져오기
        const { 회사_id } = req.body;

        if (!회사_id) {
            return res.status(400).send('회사 ID를 입력해주세요.');
        }

        // company 컬렉션에서 회사_id로 정보 조회
        const company = await db.collection('company').findOne({ 회사_고유_id: parseInt(회사_id, 10) });
        if (!company) {
            return res.status(404).send('해당 회사 ID를 가진 회사가 없습니다.');
        }

        // 결과 출력
        res.status(200).send(`
            <h2>회사 정보</h2>
            <p>회사명: ${company.회사명}</p>
            <p>위치: ${company.위치}</p>
            <p>일당: ${company.일당}</p>
            <p>회사 고유 ID: ${company.회사_고유_id}</p>
        `);
    } catch (error) {
        console.error(error);
        res.status(500).send('서버 오류가 발생했습니다.');
    }
});


app.post('/add_person', async (요청, 응답) => {
    try {
        // 요청.body 출력 (디버깅용)
        console.log(요청.body);

        // 주민등록번호 중복 확인
        const existingRecord = await db.collection('people').findOne({ 주민등록번호: 요청.body.주민등록번호 });

        if (existingRecord) {
            // 이미 존재하는 경우
            응답.status(400).send('이미 존재하는 인력입니다.');
        } else {
            // 주민등록번호가 중복되지 않으면 데이터 삽입
            await db.collection('people').insertOne({
                이름: 요청.body.이름,
                주민등록번호: 요청.body.주민등록번호,
                전화번호: 요청.body.전화번호
            });

            // 성공 시 목록 페이지로 리디렉션
            응답.redirect('/list');
        }
    } catch (error) {
        // 오류 처리
        console.error(error);
        응답.status(500).send('서버 오류가 발생했습니다.');
    }
})

app.post('/add_company', async (요청, 응답) => {
    try {
        // 요청.body 출력 (디버깅용)
        console.log(요청.body);

        // 회사 고유 id 중복 확인
        const existingId = await db.collection('company').findOne({ 회사_고유_id : parseInt(요청.body.회사_고유_id, 10) });
        console.log(existingId);
        if (existingId) {
            return 응답.status(400).send('이미 존재하는 회사 고유 id입니다.');
        } else {
            // 회사 고유 id가 중복되지 않으면 데이터 삽입
            await db.collection('company').insertOne({
            회사명 : 요청.body.회사명,
            회사_고유_id: parseInt(요청.body.회사_고유_id, 10),
            위치 : 요청.body.위치,
            일당: parseInt(요청.body.회사_고유_id, 10)
        });

            // 성공 시 목록 페이지로 리디렉션
            응답.redirect('/list');
        }
    } catch (error) {
        // 오류 처리
        console.error(error);
        응답.status(500).send('서버 오류가 발생했습니다.');
    }
})

app.post('/add_days', async (req, res) => {
    try {
        console.log(req.body);
        const { 이름, 주민등록번호, 근무요일, 회사_id } = req.body;

        // 1. people 콜렉션에서 주민등록번호 확인
        const person = await db.collection('people').findOne({ 주민등록번호 });
        if (!person) {
            return res.status(400).send('없는 사람입니다. 주민등록번호를 확인해주세요.');
        }

        // 2. company 콜렉션에서 회사_id 확인
        const company = await db.collection('company').findOne({ 회사_고유_id: parseInt(회사_id, 10) });
        if (!company) {
            return res.status(400).send('없는 회사입니다. 회사_id를 확인해주세요.');
        }

         // 3. workingDays 콜렉션에서 중복 데이터 확인
         const duplicateRecord = await db.collection('workingDays').findOne({
            주민등록번호: req.body.주민등록번호,
            근무요일: req.body.근무요일
        });
        console.log(duplicateRecord)
        if (duplicateRecord) {
            return res.status(400).send('이미 동일한 근무요일이 존재합니다.');
        }
       

        // 4. 중복이 없으면 workingDays에 데이터 추가
        await db.collection('workingDays').insertOne({
            주민등록번호,
            근무요일,
            회사_id: parseInt(회사_id, 10)
        });

        // 성공 시 목록 페이지로 리디렉션
        res.redirect('/list');
    } catch (error) {
        console.error(error);
        res.status(500).send('서버 오류가 발생했습니다.');
    }
});
