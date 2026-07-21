const getAgeGroup = (age) =>{
    if(age >= 20 && age <= 30){
        return '20-30';
    }else if(age >= 31 && age <= 40){
        return '31-40';
    }else if(age >= 41 && age <= 50){
        return '41-50';
    }else if(age >= 51 && age <= 60){
        return '51-60';
    }else if(age >= 61 && age <= 70){
        return '61-70';
    }else{
        return 'Invalid Age';
    }
}

module.exports = getAgeGroup;