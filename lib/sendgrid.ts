import sgMail from "@sendgrid/mail";
import {
  ContactsFromListParams,
  ContactsMap,
  ContactsResponse,
  MassMail,
  SendGridExportStatusResponse,
} from "./types";
import sgClient from "@sendgrid/client";
import { ClientRequest } from "@sendgrid/client/src/request";
import { PersonalizationData } from "@sendgrid/helpers/classes/personalization";
import { MailDataRequired } from "@sendgrid/mail";

export class Sendgrid {
  constructor() {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);
    sgClient.setApiKey(process.env.SENDGRID_API_KEY as string);

    console.log(process.env.SENDGRID_API_KEY);
  }

  private async createContactExport(listId: string) {
    const request = {
      url: `/v3/marketing/contacts/exports`,
      method: "POST",
      body: {
        list_ids: [listId],
        file_type: "json",
      },
    } as ClientRequest;
    const [response] = await sgClient.request(request).catch((err) => {
      throw new Error(`Couldn't create export. Error is ${err}`);
    });
    return response.body as { id: string };
  }

  private async getContactExportStatus(jobId: string) {
    const request = {
      url: `/v3/marketing/contacts/exports/${jobId}`,
      method: "GET",
    } as ClientRequest;
    const [response] = await sgClient.request(request).catch((err) => {
      throw new Error(`Couldn't create export. Error is ${err}`);
    });
    return response.body as SendGridExportStatusResponse;
  }

  async getContactsFromList({ listId }: ContactsFromListParams) {
    const SENDGRID_EXPORT_TIMEOUT = 10000;
    const RETRY_LIMIT = 5;
    let numOfRetries = 0;
    console.log("Creating contacts exports");
    const createContactExport = await this.createContactExport(listId);
    const jobId = createContactExport.id;
    console.log(`Created export with id ${jobId}`);
    let exportStatusResponse = await this.getContactExportStatus(jobId);

    do {
      console.log("Waiting export to be finished");
      await new Promise((r) => setTimeout(r, SENDGRID_EXPORT_TIMEOUT));
      exportStatusResponse = await this.getContactExportStatus(jobId);
      console.log(`Export finished with status ${exportStatusResponse.status}`);
      switch (exportStatusResponse.status) {
        case "failure":
          return Promise.reject(exportStatusResponse.message);
        case "ready":
          break;
        default:
      }
      numOfRetries++;
    } while (
      exportStatusResponse.status === "pending" &&
      numOfRetries < RETRY_LIMIT
    );
    if (numOfRetries >= RETRY_LIMIT) {
      throw new Error(
        `Couldn't export contacts within the limit. Try again later.`
      );
    }
    const exportUrl = exportStatusResponse.urls[0];
    const response = await fetch(exportUrl);

    const exportFile = await response.arrayBuffer();
    const buffer = Buffer.from(exportFile);

    const contactsList = buffer
      .toString()
      .trim()
      .split("\n")
      .map<ContactsResponse>((contact: string) => JSON.parse(contact));
    console.log(`Exported contacts: ${contactsList.length}`);
    return contactsList;
  }

  async sendBulkEmail(
    data: MassMail,
    contactsMap: ContactsMap[],
    value: string
  ): Promise<void> {
    const currentDate = new Date();
    contactsMap.forEach((contacts, index) => {
      //Schedule  batches in a minute difference
      currentDate.setMinutes(currentDate.getMinutes() + index);
      this.sendEmail(data, contacts, currentDate, value);
    });
  }

  async sendEmail(
    data: MassMail,
    contacts: ContactsMap,
    date: Date,
    value: string
  ): Promise<void> {
    const personalizations = this.prepareTemplatePersonalizations(
      data,
      contacts,
      date
    );
    const message: MailDataRequired = {
      personalizations,
      from: process.env.SENDGRID_SENDER_EMAIL as string,
      content: [{ type: "text/html", value: value }],
      templateId: data.templateId.trim(),
    };
    sgMail
      .send(message)
      .then(() => console.debug(`Email sent`))
      .catch((err) => console.error(err));
  }

  prepareTemplatePersonalizations(
    data: MassMail,
    contacts: ContactsMap,
    date: Date
  ): PersonalizationData[] {
    const personalizations: PersonalizationData[] = [];
    const scheduleAt = Math.floor(date.getTime() / 1000);
    contacts.forEach((mailList, email) => {
      personalizations.push({
        to: { email, name: "" },
        dynamicTemplateData: {
          subject: data.subject,
          firstName: mailList.firstName,
          lastName: mailList.lastName,
        },
        sendAt: scheduleAt,
      });
    });
    return personalizations;
  }
}
