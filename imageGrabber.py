filelist = open('imagelist.txt', 'r').readlines()

image_urls = {}
current_header = ""
current_list = []
for image_url in filelist:
  image_url = image_url.strip()
  if not image_url.startswith('http'): # it clearly ain't an image
    if image_url == "===": # we begin, continue
      continue
    elif image_url == "---": # ooh, we end
      image_urls[current_header]['urls'] = current_list
      current_list = []
    else:
      begin_extra_data = image_url.rfind('(', 0, image_url.rfind('facebook.com')) - 1
      current_header = image_url[:begin_extra_data]
      extra_data = image_url[begin_extra_data + 2: -1].partition('; ')
      album_name, _, uploader = current_header.partition(': ')
      image_urls[current_header] = {'urls': None, 'retrieved': extra_data[2], 'link': extra_data[0], 'title': current_header, 'album_name': album_name, 'uploader': uploader}
  else:
    current_list.append(image_url)

import os, os.path, tempfile, subprocess, multiprocessing

def fetch_set(titlename_details_pair):
  titlename, details = titlename_details_pair
  dir_name = os.path.join('output', titlename)
  if not os.path.exists(dir_name):
    print "Creating directory:", dir_name
    os.makedirs(dir_name)
    
  # write out current data
  p = open(os.path.join(dir_name, 'details.txt'), 'w')
  p.write("""
  Data retrieved by Luke Granger-Brown's Facebook Active Retrieval Transit System
  
  Album Name: %s
  Uploaded By: %s
  Retrieved At: %s
  Photo Count: %d
  Original Album: %s
  """ % (details['album_name'], details['uploader'], details['retrieved'], len(details['urls']), details['link']))
  p.close()
    
  url_file = tempfile.NamedTemporaryFile()
  url_file.write("\n".join(details['urls']))
  url_file.flush()
  os.fsync(url_file.fileno())
  url_file.flush()
  os.fsync(url_file.fileno()) # okay, we're flushed! :)
  
  # invoke wget
  subprocess.call(["wget", "-nc", "-i", url_file.name, "-nv", "-nd", "-P", dir_name])
  
q = multiprocessing.Pool(5)
q.map(fetch_set, image_urls.iteritems())