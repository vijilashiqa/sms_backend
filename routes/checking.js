function curday(day){
// console.log(day);
let days=['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
console.log(days[day]);

}

// curday(0);



process=require('process');
if(process.argv[2]==null || process.argv[2]==''){
    console.log("No First Input.");
}else{
curday(process.argv[2]);
}

if(process.argv[3]==null || process.argv[3]==''){
    console.log("No Second Input.");
}else{
    console.log(process.argv[3]);
}