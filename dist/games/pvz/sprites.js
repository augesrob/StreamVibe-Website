var container = document.getElementById('container');

// function tallnutPosition

//常规植物位置
function generalPosition(peashooter){
    var top = peashooter.offsetTop;
    if (top < 0 || top > 495) {
        container.removeChild(peashooter);
        return false;//种出边界
    }
    if (top >= 0 && top <= 95) {
        peashooter.style.top = '90px';
        peashooter.route = 0;
    } else if (top > 95 && top <= 195) {
        peashooter.style.top = '190px';
        peashooter.route = 1;
    } else if (top > 195 && top <= 295) {
        peashooter.style.top = '290px';
        peashooter.route = 2;
    } else if (top > 295 && top <= 395) {
        peashooter.style.top = '390px';
        peashooter.route = 3;
    } else if (top > 395 && top <= 495) {
        peashooter.style.top = '490px';
        peashooter.route = 4;
    }
    return true;
}

//高坚果创建
function highPosition(nut){
    var top = nut.offsetTop;
    if (top < 0 || top > 495) {
        container.removeChild(nut);
        return false;//种出边界
    }
    if (top >= 0 && top <= 95) {
        nut.style.top = '58px';
        nut.route = 0;
    } else if (top > 95 && top <= 195) {
        nut.style.top = '158px';
        nut.route = 1;
    } else if (top > 195 && top <= 295) {
        nut.style.top = '258px';
        nut.route = 2;
    } else if (top > 295 && top <= 395) {
        nut.style.top = '358px';
        nut.route = 3;
    } else if (top > 395 && top <= 495) {
        nut.style.top = '458px';
        nut.route = 4;
    }
    return true;
}

//植物跟随鼠标移动
function followMouse(plant){
    plant.attack = [];//谁在吃我
    plant.style.position = 'absolute';
    //取消右击菜单
    document.oncontextmenu = e => {
        e.preventDefault();//禁止默认效果
    }
    document.onmousemove = e => {
        plant.style.top = e.y - 40 + 'px';
        plant.style.left = e.x - 40 + 'px';
    }
}

//坚果创建
function createNut(type,onclick){
    var nut = document.createElement('img');
    if(type==7){
        nut.src = 'images/TallNut.gif'
        nut.score = 200;
        nut.blood = 900;
    }
    followMouse(nut);
    document.onmousedown = e=>{
        document.onmousemove = null;
        document.onmousedown = null;
        if(e.button == 2){
            container.removeChild(nut);
        }else if(e.button == 0){
            highPosition(nut);
            onclick(nut);
        }
    }
    container.appendChild(nut);
    return nut;

}

//射手类植物创建 包括向日葵
function createPeashooter(type,onclick) {
    var peashooter = document.createElement('img');
    peashooter.type = type;
    if(type == 1){
        peashooter.src = 'images/Peashooter.gif';
        peashooter.score = 100;
    }else if(type ==2){
        peashooter.src = 'images/SnowPea.gif'
        peashooter.score = 175;
    }else if(type == 3){
        peashooter.src = 'images/SunFlower.gif'
        peashooter.score = 75;
    }else if (type == 4){
        peashooter.src = 'images/Repeater.gif'
        peashooter.score = 200;
    }else if (type == 5){
        peashooter.src = 'images/GatlingPea.gif';
        peashooter.score = 325;
    }else if (type == 8){
        peashooter.src = 'images/TwinSunflower.gif';
        peashooter.score = 125;
    }
    peashooter.blood = 500;
    followMouse(peashooter);
    document.onmousedown = e => {
        document.onmousemove = null;
        document.onmousedown = null;//鼠标左击取消移动与点击事件
        if (e.button == 2) {
            container.removeChild(peashooter);
        } else if (e.button == 0) {
            generalPosition(peashooter);
            onclick(peashooter);
        }
    }
    container.appendChild(peashooter);
    return peashooter;
}

//创建爆炸类植物
function createBomb(type,onclick){//辣椒5 樱桃 毁灭菇
    var bomb = document.createElement('img');
    bomb.type = type;
    if(type == 5){
        bomb.src = 'images/Jalapeno.gif';  
        bomb.score = 200;
        boom.blood = 500;      
    }else{
        bomb.src = 'images/CherryBomb.gif';  
        bomb.score = 250;
        boom.blood = 500;
    }
    followMouse(bomb);// 跟随鼠标移动
    document.onmousedown = e => {
        document.onmousemove = null;
        document.onmousedown = null;//鼠标左击取消移动与点击事件
        if (e.button == 2) {
            container.removeChild(bomb);
        } else if (e.button == 0) {
            generalPosition(bomb);
            onclick(bomb);
        }
    }
    container.appendChild(bomb);
    return bomb;
}

function createSun(flower,code,disappear){
    var sun = document.createElement('img');
    sun.src = 'images/Sun.gif'
    sun.style.position = 'absolute'
    sun.style.top = flower.offsetTop + 'px'
    sun.style.left = flower.offsetLeft + 'px'
    sun.code = new Date().getTime() + 'sun' + code;
    sun.step = ()=>{
        if(sun.offsetTop > -100){
            sun.style.top = sun.offsetTop -4 + 'px'
        } else{
            disappear(sun);
        }
    };
    container.appendChild(sun);
    return sun
}

function createBullet(peashooter, code, disappear) {//豌豆射手 编号
    var bullet = document.createElement('img');
    bullet.route = peashooter.route;
    bullet.code = new Date().getTime() + 'bullet' + code; //bullet是分隔符左侧为时间右侧为编号
    bullet.type = peashooter.type;
    if([1,4,5].indexOf(peashooter.type) >= 0 ){
        bullet.src = 'images/Bullet.gif';
    }else if(peashooter.type == 2){
        bullet.src = 'images/SnowBullet.gif';
    }
    bullet.style.position = 'absolute';//定位
    if(peashooter.type != 5)
        bullet.style.top = peashooter.offsetTop + 'px';
    else
        bullet.style.top = peashooter.offsetTop + 10 +'px';
    bullet.style.left = peashooter.offsetLeft + 38 + 'px';
    bullet.step = () => {
        if (bullet.src.endsWith('Bullet.gif') && bullet.offsetLeft < 1000) {
            bullet.style.left = bullet.offsetLeft + 4 + 'px';
        } else {
            disappear(bullet);
        }
    }
    container.appendChild(bullet);
    return bullet;
}

//创建僵尸
function createZombie(id,gameover) {
    var zombie = document.createElement('img');
    zombie.style.position = 'absolute';
    zombie.style.zIndex = '100';
    //五条路，随机选一条[30,130,230,330]
    zombie.route = parseInt(Math.random() * 5);
    zombie.style.top = [30, 130, 230, 330, 430][zombie.route] + 'px'
    zombie.style.left = '900px'
    zombie.id = id;
    zombie.status = parseInt(Math.random()*6);
    if([0,1,2].indexOf(zombie.status) != -1){
        zombie.blood = 9;
        zombie.src = 'images/Zombie.gif';
    }else if(zombie.status == 5){
        zombie.src = 'images/BucketheadZombie.gif';
        zombie.blood = 49;//铁桶
    }else {
        zombie.src = 'images/ConeheadZombie.gif';
        zombie.blood = 29;//路障
    }
    
    zombie.counter = 0;//僵尸计数器
    zombie.speed = 2;
    //走步函数
    zombie.step = () => {
        zombie.counter++;
        if (zombie.counter < 10) {
            return; //直接出去，不走
        }
        zombie.counter = 0;//走之前归零
        if (zombie.src.endsWith('Zombie.gif') && zombie.offsetLeft > -200) {//没进房，僵尸可以向左走
            zombie.style.left = zombie.offsetLeft - zombie.speed + 'px';
        }//(-200,-150)僵尸进房
        if(zombie.offsetLeft < -150){
            gameover();
        }
    }
    container.appendChild(zombie);
    return zombie;
}

function createHead(zombie) {
    var head = document.createElement('img');
    head.src = 'images/ZombieHead.gif';
    head.style.position = 'absolute';
    head.style.top = zombie.offsetTop + 'px';
    head.style.left = zombie.offsetLeft + 42 + 'px';
    container.appendChild(head); //僵尸脑袋加入容器
    return head;
}
