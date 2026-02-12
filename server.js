import express from "express"
import cors from "cors"
import fs from "fs"
import { fileURLToPath } from "url"
import { dirname, join } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = 8000
const ADMIN_PASSWORD = "ghapaghap"
const DATA_FILE = join(__dirname, "media.json")

app.use(cors())
app.use(express.json())
app.use(express.static(__dirname))


app.get("/", (req, res) => {
    res.sendFile(join(__dirname,"my_html.html"))
})

function readData(){
    if(!fs.existsSync(DATA_FILE)) return []
    return JSON.parse(fs.readFileSync(DATA_FILE,"utf-8"))
}

function writeData(data){
    fs.writeFileSync(DATA_FILE,JSON.stringify(data,null,2))
}

app.get("/api/media",(req,res)=>{
    res.json(readData())
})

app.delete("/api/media",(req,res)=>{
    const { password, url } = req.body
    if(password !== ADMIN_PASSWORD){
        return res.status(401).end()
    }

    const data = readData()
    const updated = data.filter(item => item.high_quality !== url)

    writeData(updated)
    res.json(updated)
})



app.get("/about-us", (req,res)=>{
    res.sendFile(join(__dirname, "about_us.html"))
})

app.use((req, res) => {
  res.status(404).sendFile(join(__dirname, "404.html"));
})


app.listen(PORT,()=>console.log(`http://localhost:${PORT}`))
