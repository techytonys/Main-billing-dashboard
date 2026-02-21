// Notion integration - uses Replit connector for authentication
import { Client } from '@notionhq/client';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=notion',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Notion not connected');
  }
  return accessToken;
}

export async function getUncachableNotionClient() {
  const accessToken = await getAccessToken();
  return new Client({ auth: accessToken });
}

export async function syncArticleToNotion(article: { title: string; content: string; category: string; status: string }, existingPageId?: string | null): Promise<string | null> {
  try {
    const notion = await getUncachableNotionClient();

    const contentBlocks: any[] = [];
    const htmlContent = article.content || '';
    const plainText = htmlContent.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

    const tagPattern = /<(h1|h2|h3|p|li|blockquote|pre|br)[^>]*>(.*?)<\/\1>|<br\s*\/?>/gi;
    let match;
    let hasMatches = false;

    while ((match = tagPattern.exec(htmlContent)) !== null) {
      hasMatches = true;
      const tag = (match[1] || '').toLowerCase();
      const inner = (match[2] || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').trim();
      if (!inner && tag !== 'br') continue;

      if (tag === 'h1') {
        contentBlocks.push({ object: 'block', type: 'heading_1', heading_1: { rich_text: [{ type: 'text', text: { content: inner } }] } });
      } else if (tag === 'h2') {
        contentBlocks.push({ object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: inner } }] } });
      } else if (tag === 'h3') {
        contentBlocks.push({ object: 'block', type: 'heading_3', heading_3: { rich_text: [{ type: 'text', text: { content: inner } }] } });
      } else if (tag === 'li') {
        contentBlocks.push({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [{ type: 'text', text: { content: inner } }] } });
      } else if (tag === 'blockquote') {
        contentBlocks.push({ object: 'block', type: 'quote', quote: { rich_text: [{ type: 'text', text: { content: inner } }] } });
      } else if (tag === 'pre') {
        contentBlocks.push({ object: 'block', type: 'code', code: { rich_text: [{ type: 'text', text: { content: inner } }], language: 'plain text' } });
      } else if (inner) {
        contentBlocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: inner } }] } });
      }
    }

    if (!hasMatches && plainText) {
      contentBlocks.push({ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: plainText } }] } });
    }

    const chunkedBlocks = [];
    for (let i = 0; i < contentBlocks.length; i += 100) {
      chunkedBlocks.push(contentBlocks.slice(i, i + 100));
    }

    if (existingPageId) {
      let cursor: string | undefined;
      do {
        const existingBlocks = await notion.blocks.children.list({ block_id: existingPageId, start_cursor: cursor, page_size: 100 });
        for (const block of existingBlocks.results) {
          try { await notion.blocks.delete({ block_id: (block as any).id }); } catch (e) {}
        }
        cursor = existingBlocks.has_more ? existingBlocks.next_cursor ?? undefined : undefined;
      } while (cursor);

      await notion.pages.update({
        page_id: existingPageId,
        properties: {
          title: { title: [{ text: { content: article.title } }] },
        },
      });

      for (const chunk of chunkedBlocks) {
        await notion.blocks.children.append({ block_id: existingPageId, children: chunk });
      }

      return existingPageId;
    } else {
      const searchResult = await notion.search({
        filter: { property: 'object', value: 'page' },
        page_size: 5,
      });

      let parentPageId: string | undefined;
      for (const result of searchResult.results) {
        const r = result as any;
        if (r.parent?.type === 'workspace') {
          parentPageId = r.id;
          break;
        }
      }

      if (!parentPageId && searchResult.results.length > 0) {
        parentPageId = (searchResult.results[0] as any).id;
      }

      const firstChunk = chunkedBlocks.length > 0 ? chunkedBlocks[0] : [];

      let createParams: any;
      if (parentPageId) {
        createParams = {
          parent: { page_id: parentPageId },
          properties: { title: { title: [{ text: { content: article.title } }] } },
          children: firstChunk,
        };
      } else {
        createParams = {
          parent: { workspace: true },
          properties: { title: { title: [{ text: { content: article.title } }] } },
          children: firstChunk,
        };
      }

      const page = await notion.pages.create(createParams);

      for (let i = 1; i < chunkedBlocks.length; i++) {
        await notion.blocks.children.append({ block_id: page.id, children: chunkedBlocks[i] });
      }

      return page.id;
    }
  } catch (error) {
    console.error('Notion sync error:', error);
    return null;
  }
}
