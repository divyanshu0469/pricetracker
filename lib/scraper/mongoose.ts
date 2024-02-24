import mongoose from 'mongoose';

let isConnected = false; //  variable to ceck connection status

export const connectToDB = async () => {
    mongoose.set('strictQuery', true);
    
    if(!process.env.MONGODB_URI) return console.log('MONGODB_URI is not defined');

    if(isConnected) return console.log('=> using existing database connection');

    try {
        await mongoose.connect(process.env.MONGODB_URI);

        isConnected = true;

        console.log('MongDB Connected');
    } catch (error) {
        console.log(error);
    }
}