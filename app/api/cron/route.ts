import Product from "@/lib/models/product.model";
import { generateEmailBody, sendEmail } from "@/lib/nodemailer";
import { scrapeAmazonProduct } from "@/lib/scraper";
import { connectToDB } from "@/lib/scraper/mongoose"
import { getAveragePrice, getEmailNotifType, getHighestPrice, getLowestPrice } from "@/lib/scraper/utils";
import { NextResponse } from "next/server";

export const maxDuration = 10; // 5 min
export const dynamic = 'force-dynamic'
export const revalidate = 0;

export async function GET(request: Request) {
    try {
        connectToDB;

        const products = await Product.find({});

        if(!products) throw new Error("No Products found");

        // 1.  scraoe latest product details & update db

        const updatedProducts = await Promise.all(
            products.map(async (currentProduct) => {
                const scrapedProduct = await scrapeAmazonProduct(currentProduct.url);

                if(!scrapedProduct) throw new Error("No Product found");

                const updatedPriceHistory: any = [
                    ...currentProduct.priceHistory,
                    {
                        price: scrapedProduct.currentPrice,
                    },
                ];
    
                const product = {
                    ...scrapedProduct,
                    priceHistory: updatedPriceHistory,
                    lowestPrice: getLowestPrice(updatedPriceHistory),
                    highestPrice: getHighestPrice(updatedPriceHistory),
                    averagePrice: getAveragePrice(updatedPriceHistory),
                }
                
        
                const updatedProduct = await Product.findOneAndUpdate(
                    { url: product.url },
                    product
                );

                // 2. check each products status and send email accordingly

                const emailNotifType = getEmailNotifType(scrapedProduct, currentProduct)

                if(emailNotifType && updatedProduct.users.length > 0) {
                    const productInfo = {
                        title: updatedProduct.title,
                        url: updatedProduct.url,
                    }

                    const emailContent = await generateEmailBody(productInfo, emailNotifType);

                    const userEmails = updatedProduct.users.map((user: any) => user.email)

                    await sendEmail(emailContent, userEmails);
                }

                return updatedProduct;
            })
        )

        return NextResponse.json({
            message: 'Ok', data: updatedProducts,
        });
    } catch(error: any) {
        throw new Error(`Error in GET: ${error.message}`)
    }
}