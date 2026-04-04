import redirectRules from './redirect-rules.json';

function appendPath(destination, pathSuffix) {
  if (!pathSuffix || pathSuffix === '/') {
    return destination;
  }

  if (destination.endsWith('/') && pathSuffix.startsWith('/')) {
    return destination + pathSuffix.slice(1);
  }

  if (!destination.endsWith('/') && !pathSuffix.startsWith('/')) {
    return `${destination}/${pathSuffix}`;
  }

  return destination + pathSuffix;
}

export function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  const host = url.hostname;
  const path = url.pathname;

  let specificPathMatchedRule = null;
  let rootDomainMatchedRule = null;
  let defaultRule = null;

  for (const rule of redirectRules) {
    if (rule.default === true) {
      defaultRule = rule;
      continue;
    }

    if (!rule.domain) {
      continue;
    }

    // 优先匹配带有特定路径的规则
    if (rule.domain === host && rule.path && path.startsWith(rule.path)) {
      specificPathMatchedRule = rule;
      break;
    }

    if (rule.domain === host && !rule.path) {
      rootDomainMatchedRule = rule;
    }
  }

  if (specificPathMatchedRule) {
    let destination = specificPathMatchedRule.destination;

    // 如果路径有两个及以上的"/"，把匹配路径后面的部分追加到目标地址
    if (specificPathMatchedRule.path && path.startsWith(specificPathMatchedRule.path)) {
      const remainingPath = path.substring(specificPathMatchedRule.path.length);
      if (remainingPath) {
        destination = appendPath(destination, remainingPath);
      }
    }

    if (url.search) {
      destination += url.search;
    }

    return Response.redirect(destination, specificPathMatchedRule.statusCode || 302);
  }

  if (rootDomainMatchedRule) {
    let destination = rootDomainMatchedRule.destination;

    destination = appendPath(destination, path);

    if (url.search) {
      destination += url.search;
    }

    return Response.redirect(destination, rootDomainMatchedRule.statusCode || 302);
  }

  if (defaultRule) {
    return Response.redirect(defaultRule.destination, defaultRule.statusCode || 302);
  }

  return new Response('Not Found', { status: 404 });
}
