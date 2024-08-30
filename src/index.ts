import { mapChunk } from "../lib/mapChunk";
import { Sendgrid } from "../lib/sendgrid";
import { ContactsMap, ContactsResponse, MassMail } from "../lib/types";
import * as dotenv from "dotenv";
dotenv.config();
async function sendVicinityInvestorMail(data: MassMail) {
  const sendgrid = new Sendgrid();
  const sgContacts = await sendgrid.getContactsFromList(data);
  console.log(sgContacts);
  const sendList: ContactsMap = new Map();
  const emailList = sgContacts.map((contact: ContactsResponse) => ({
    email: contact.email,
    firstName: contact.first_name,
    lastName: contact.last_name,
  }));
  for (const user of emailList) {
    sendList.set(user.email, {
      firstName: user.firstName as string,
      lastName: user.lastName as string,
    });
  }
  const contacts = mapChunk(sendList, 1000);
  console.log(contacts.length);
  sendgrid.sendBulkEmail(data, contacts, "investor-matching");
}

const data: MassMail = {
  listId: process.env.INVESTOR_CONTACTS_LISTID as string,
  templateId: process.env.INVESTOR_TEMPLATE_ID as string,
  subject: "",
};

sendVicinityInvestorMail(data);
