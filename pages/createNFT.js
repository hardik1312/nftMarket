import {useState} from 'react'
import {ethers} from 'ethers'
import {create} from 'ipfs-http-client'
import {useRouter} from 'next/router'
import Web3Modal from'web3modal'

// const {create} =require('ipfs-http-client')

const projectId="2KuvAYJu0kvpHCT4uV9xdtnuDaw";
const projectSecret="eeab44c90ec60e9d02f9b9d7434a973b";

const auth= "Basic " +  Buffer.from(projectId + ":" +projectSecret).toString("base64");
const client = create({
  host:"ipfs.infura.io",
  port:5001,
  protocol:"https",
  headers:{
    authorization:auth
  },
})

import {nftaddress, nftmarketaddress} from "../config";

import NFT from '../artifacts/contracts/NFT.sol/NFT.json';
import NFTMarket from "../artifacts/contracts/NFTMarket.sol/NFTMarket.json";

export default function CreateItem(){
  const[fileUrl,setFileUrl] = useState(null);
  const[formInput,updateFormInput] = useState({price:"",name:"",description:""});

  const router = useRouter();

  async function onChange(e){
    const file=e.target.files[0];
    try{
      const added=await client.add(
        file,{
          progress:(prog)=>console.log(`received:${prog}`)
        }
      );
      const url = `https://ipfs.infura.io:5001/${added.path}`;
      setFileUrl(url);
    }
    catch(error){
      console.log("error uploading file, please try again:", error);
    }
  }

  async function CreateItem(){
    const {name, description, price} =formInput;
    if(!name || !description || !price || !fileUrl) return;

    const data = JSON.stringify({
      name, description, image:fileUrl
    })

    try{
      const added = await client.add(data)
      const url = `https://ipfs.infura.io/ipfs/${added.path}`
      createSale(url)
    }
    catch(error){
      console.log('error uploading file:', error);
    }
  }

  async function createSale(url){
    const web3Modal = new web3Modal();
    const connection = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(connection);
    const signer = provider.getSigner();

    let contract = new ethers.Contract(nftaddress, NFT.abi, signer);
    let transaction = await contract.createToken(url);
    let tx = await transaction.wait();
    let event = tx.events[0];
    let value = event.args[2];
    let tokenId = value.toNumber();

    const price = ethers.utils.parseUnits(formInput.price,'ethers');

    let contract2 = new ethers.Contract(nftmarketaddress, NFTMarket.abb, signer);
    let listingPrice = await contract2.getListingPrice();
    listingPrice = listingPrice.toString();

    let transaction2 = await contract2.createMarketItem(nftaddress, tokenId, price, {value: listingPrice});
    await transaction.wait();
    router.push('/');
  }

  return(
    <div className='flex justify-center'>
      <div className='w-1/2 flex flex-col pb-12'>
        <input placeholder='NFT Name'
        className='mt-8 border rounded p-4'
        onChange={e => updateFormInput({...formInput, name:e.target.value})}/>
        
        <textarea 
        placeholder='NFT Description'
        className='mt-8 border rounder p-4'
        onChange={e => updateFormInput({...formInput,description:e.target.value})}/>

        <input placeholder='NFT price in eth'
        className='mt-2 border rounded p-4'
        onChange={e => updateFormInput({...formInput, price:e.target.value})}/>

        <input type='file'
        name='asset'
        className='my-3'
        onChange={onChange}/>

        {
        fileUrl && (
          <img className='rounded mt-4' width='350' src={fileUrl} />
        )
        }

        <button onClick={CreateItem}
        className='font-bold mt-4 bg-gradient-to-r from-green-400 to-blue-500 hover:from-pink-500 hover:to-yellow-500 text-white rounded p-4 shadow-lg'>
          Create NFT
        </button>
      </div>
    </div>
  )
}